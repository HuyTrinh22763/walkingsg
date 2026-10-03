import React, { useRef, useCallback, useEffect } from 'react';
import { Platform, View } from 'react-native';
import { oneMapStyles, iframeStyle } from './OneMapView.styles';

// Section OneMapView Types
export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapPin {
  id: string;
  position: LatLng;
  type: 'origin' | 'destination' | 'user' | 'hazard' | 'caution';
  label?: string;
  detail?: string;
}

export interface OneMapViewProps {
  /** Initial map center. Defaults to Bencoolen St, Singapore */
  center?: LatLng;
  zoom?: number;
  /** Polyline route as ordered [lat, lng] pairs */
  routeCoordinates?: LatLng[];
  /** Custom pins to render on the map */
  pins?: MapPin[];
  /** Show dashed red out-of-bounds boundary ring */
  showOutOfBoundsBoundary?: boolean;
  /** Ref handle to imperatively call zoom in/out */
  mapRef?: React.MutableRefObject<OneMapViewHandle | null>;
  onMarkerPress?: (id: string) => void;
  onMapPress?: (coords: LatLng) => void;
}

export interface OneMapViewHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  setCenter: (coords: LatLng) => void;
}
// End Section OneMapView Types

// Section Leaflet HTML Builder
function buildLeafletHtml(props: OneMapViewProps): string {
  const center = props.center ?? { lat: 1.2966, lng: 103.8498 }; // Bencoolen St
  const zoom = props.zoom ?? 16;
  const route = props.routeCoordinates ?? [];
  const pins = props.pins ?? [];
  const showBoundary = props.showOutOfBoundsBoundary ?? false;

  const routeJson = JSON.stringify(route.map((c) => [c.lat, c.lng]));
  const pinsJson = JSON.stringify(pins);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>WalkingSG Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #e7eed9; }

    /* Custom pulsing user location dot */
    @keyframes pulse {
      0%   { transform: scale(1);   opacity: 1; }
      50%  { transform: scale(1.6); opacity: 0.4; }
      100% { transform: scale(1);   opacity: 1; }
    }
    .user-dot-ring {
      width: 28px; height: 28px; border-radius: 50%;
      background: rgba(31,111,67,0.2);
      display: flex; align-items: center; justify-content: center;
      animation: pulse 2s infinite;
    }
    .user-dot-core {
      width: 14px; height: 14px; border-radius: 50%;
      background: #1f6f43; border: 2.5px solid #ffffff;
      box-shadow: 0 0 6px rgba(31,111,67,0.6);
    }

    /* Hazard pin */
    .hazard-pin {
      width: 28px; height: 28px; border-radius: 50%;
      background: #f0dad3; border: 2px solid #9c2a20;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: bold; color: #9c2a20;
    }
    .caution-pin {
      width: 28px; height: 28px; border-radius: 50%;
      background: #f3e6c9; border: 2px solid #855111;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: bold; color: #855111;
    }

    /* Boundary overlay ring */
    .leaflet-pane .boundary-pulse {
      animation: boundary-flash 1.5s ease-in-out infinite alternate;
    }
    @keyframes boundary-flash {
      from { opacity: 0.6; }
      to   { opacity: 1; }
    }

    /* Attribution fix */
    .leaflet-control-attribution { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // --- Map Init ---
    var map = L.map('map', {
      center: [${center.lat}, ${center.lng}],
      zoom: ${zoom},
      zoomControl: false,
      minZoom: 11,
      maxZoom: 19,
      maxBounds: [[1.15, 103.58], [1.48, 104.05]],
      maxBoundsViscosity: 0.9,
    });

    // --- Tile Layer: OneMap (primary) with OSM fallback ---
    var oneMapTile = L.tileLayer(
      'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OneMap SLA Singapore',
        maxZoom: 19,
        detectRetina: false,
      }
    );
    var osmFallback = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }
    );

    oneMapTile.addTo(map);
    oneMapTile.on('tileerror', function () {
      if (!map.hasLayer(osmFallback)) {
        map.removeLayer(oneMapTile);
        osmFallback.addTo(map);
      }
    });

    // --- Out-of-bounds dashed boundary ring ---
    ${showBoundary ? `
    var boundaryBox = L.rectangle(
      [[1.15, 103.58], [1.48, 104.05]],
      { color: '#9c2a20', weight: 2.5, dashArray: '8, 8', fill: false, className: 'boundary-pulse' }
    ).addTo(map);
    ` : ''}

    // --- Route Polyline ---
    var routeCoords = ${routeJson};
    if (routeCoords.length > 1) {
      L.polyline(routeCoords, {
        color: '#1f6f43',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: null,
      }).addTo(map);
    }

    // --- Custom Pin Factory ---
    function createUserIcon() {
      return L.divIcon({
        html: '<div class="user-dot-ring"><div class="user-dot-core"></div></div>',
        className: '', iconSize: [28, 28], iconAnchor: [14, 14],
      });
    }
    function createOriginIcon() {
      return L.divIcon({
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#1f6f43;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(31,111,67,0.5)"></div>',
        className: '', iconSize: [16, 16], iconAnchor: [8, 8],
      });
    }
    function createDestIcon() {
      return L.divIcon({
        html: '<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z" fill="#a94c1c"/><circle cx="12" cy="12" r="5" fill="#fff"/></svg>',
        className: '', iconSize: [24, 32], iconAnchor: [12, 32],
      });
    }
    function createHazardIcon(type) {
      var cls = type === 'hazard' ? 'hazard-pin' : 'caution-pin';
      return L.divIcon({
        html: '<div class="' + cls + '">!</div>',
        className: '', iconSize: [28, 28], iconAnchor: [14, 14],
      });
    }

    // --- Render Pins ---
    var pins = ${pinsJson};
    pins.forEach(function(pin) {
      var icon;
      if (pin.type === 'user')        icon = createUserIcon();
      else if (pin.type === 'origin') icon = createOriginIcon();
      else if (pin.type === 'destination') icon = createDestIcon();
      else icon = createHazardIcon(pin.type);

      var marker = L.marker([pin.position.lat, pin.position.lng], { icon: icon });
      if (pin.label || pin.detail) {
        marker.bindPopup(
          '<b>' + (pin.label || '') + '</b>' +
          (pin.detail ? '<br/><span style="font-size:12px;color:#57503f">' + pin.detail + '</span>' : '')
        );
      }
      marker.on('click', function() {
        postToRN({ type: 'onMarkerPress', id: pin.id });
      });
      marker.addTo(map);
    });

    // --- Map click event ---
    map.on('click', function(e) {
      postToRN({ type: 'onMapPress', lat: e.latlng.lat, lng: e.latlng.lng });
    });

    // --- Two-way Bridge: RN → Leaflet ---
    function handleMessage(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'zoomIn')  map.zoomIn();
        if (data.type === 'zoomOut') map.zoomOut();
        if (data.type === 'setCenter') map.flyTo([data.lat, data.lng], data.zoom || map.getZoom());
        if (data.type === 'drawRoute' && data.coordinates && data.coordinates.length > 1) {
          L.polyline(data.coordinates, { color: '#1f6f43', weight: 6, lineCap: 'round' }).addTo(map);
        }
      } catch(e) {}
    }

    // Listen for messages from both WebView and iframe parent
    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);

    // --- Two-way Bridge: Leaflet → RN ---
    function postToRN(payload) {
      try {
        var msg = JSON.stringify(payload);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(msg);
        } else {
          window.parent.postMessage(msg, '*');
        }
      } catch(e) {}
    }
  </script>
</body>
</html>`;
}
// End Section Leaflet HTML Builder

// Section OneMapView Component
export default function OneMapView(props: OneMapViewProps) {
  const html = buildLeafletHtml(props);

  // --- Native path: react-native-webview ---
  if (Platform.OS !== 'web') {
    // Lazy import to avoid crashing on web bundler
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const WebView = require('react-native-webview').default;

    const webViewRef = useRef<any>(null);

    const postToMap = useCallback((msg: object) => {
      webViewRef.current?.postMessage(JSON.stringify(msg));
    }, []);

    // Wire up imperative handle
    useEffect(() => {
      if (props.mapRef) {
        props.mapRef.current = {
          zoomIn:    () => postToMap({ type: 'zoomIn' }),
          zoomOut:   () => postToMap({ type: 'zoomOut' }),
          setCenter: (c) => postToMap({ type: 'setCenter', lat: c.lat, lng: c.lng }),
        };
      }
    }, [postToMap, props.mapRef]);

    const handleMessage = useCallback((event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'onMarkerPress') props.onMarkerPress?.(data.id);
        if (data.type === 'onMapPress')    props.onMapPress?.({ lat: data.lat, lng: data.lng });
      } catch (_) {}
    }, [props.onMarkerPress, props.onMapPress]);

    return (
      <View style={oneMapStyles.mapContainer}>
        <WebView
          ref={webViewRef}
          style={oneMapStyles.webView}
          source={{ html }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMessage}
          scrollEnabled={false}
          allowsInlineMediaPlayback
        />
      </View>
    );
  }

  // --- Web path: iframe (prevents react-native-webview from crashing the web bundler) ---
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const postToMap = useCallback((msg: object) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
  }, []);

  useEffect(() => {
    if (props.mapRef) {
      props.mapRef.current = {
        zoomIn:    () => postToMap({ type: 'zoomIn' }),
        zoomOut:   () => postToMap({ type: 'zoomOut' }),
        setCenter: (c) => postToMap({ type: 'setCenter', lat: c.lat, lng: c.lng }),
      };
    }
  }, [postToMap, props.mapRef]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'onMarkerPress') props.onMarkerPress?.(data.id);
        if (data.type === 'onMapPress')    props.onMapPress?.({ lat: data.lat, lng: data.lng });
      } catch (_) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [props.onMarkerPress, props.onMapPress]);

  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);

  return (
    <View style={oneMapStyles.mapContainer}>
      <iframe
        ref={iframeRef}
        src={blobUrl}
        style={iframeStyle as any}
        sandbox="allow-scripts allow-same-origin"
        title="WalkingSG Map"
      />
    </View>
  );
}
// End Section OneMapView Component
