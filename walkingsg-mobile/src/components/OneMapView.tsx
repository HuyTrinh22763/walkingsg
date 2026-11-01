import React, { useRef, useCallback, useEffect, useMemo } from 'react';
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
  /** Real-time compass heading in degrees (0-360) for navigation view cone */
  userHeading?: number | null;
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

    /* Custom pulsing user location dot and navigation scope beam */
    @keyframes pulse {
      0%   { transform: scale(1);   opacity: 1; }
      50%  { transform: scale(1.6); opacity: 0.4; }
      100% { transform: scale(1);   opacity: 1; }
    }
    .user-pin-wrapper {
      position: relative;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-heading-cone {
      position: absolute;
      width: 140px;
      height: 140px;
      top: -56px;
      left: -56px;
      pointer-events: none;
      transform-origin: 70px 70px;
      transition: transform 0.12s cubic-bezier(0.2, 0.8, 0.4, 1), opacity 0.25s ease;
      z-index: 1;
    }
    .user-dot-ring {
      position: relative;
      z-index: 2;
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

    var markers = {};
    var routeLayer = null;
    var routeCoords = ${routeJson};
    var pins = ${pinsJson};
    var currentHeading = ${props.userHeading != null ? props.userHeading : 'null'};
    var currentAngle = ${props.userHeading != null ? props.userHeading : 'null'};

    function unwrapAngle(targetDeg, current) {
      if (current === null || isNaN(current)) return targetDeg;
      var diff = (targetDeg - current) % 360;
      if (diff <= -180) diff += 360;
      if (diff > 180) diff -= 360;
      return current + diff;
    }

    function updateHeading(deg) {
      currentHeading = deg;
      var cone = document.getElementById('user-heading-cone');
      if (!cone) return;
      if (deg === null || deg === undefined || isNaN(deg)) {
        cone.style.opacity = '0';
        return;
      }
      var normalized = ((deg % 360) + 360) % 360;
      currentAngle = unwrapAngle(normalized, currentAngle);
      cone.style.transform = 'rotate(' + currentAngle + 'deg)';
      cone.style.opacity = '1';
    }

    // --- Custom Pin Factory ---
    function createUserIcon() {
      var transformStyle = (currentAngle !== null && !isNaN(currentAngle))
        ? 'transform: rotate(' + currentAngle + 'deg); opacity: 1;'
        : 'opacity: 0;';
      return L.divIcon({
        html: '<div class="user-pin-wrapper">' +
                '<div id="user-heading-cone" class="user-heading-cone" style="' + transformStyle + '">' +
                  '<svg width="140" height="140" viewBox="0 0 140 140" style="overflow:visible;">' +
                    '<defs>' +
                      '<radialGradient id="headingConeGrad" gradientUnits="userSpaceOnUse" cx="70" cy="70" r="70" fx="70" fy="70">' +
                        '<stop offset="0%" stop-color="#1f6f43" stop-opacity="0.45" />' +
                        '<stop offset="35%" stop-color="#22c55e" stop-opacity="0.22" />' +
                        '<stop offset="70%" stop-color="#4ade80" stop-opacity="0.07" />' +
                        '<stop offset="100%" stop-color="#4ade80" stop-opacity="0" />' +
                      '</radialGradient>' +
                      '<radialGradient id="headingCoreGrad" gradientUnits="userSpaceOnUse" cx="70" cy="70" r="50" fx="70" fy="70">' +
                        '<stop offset="0%" stop-color="#1f6f43" stop-opacity="0.65" />' +
                        '<stop offset="40%" stop-color="#22c55e" stop-opacity="0.3" />' +
                        '<stop offset="100%" stop-color="#1f6f43" stop-opacity="0" />' +
                      '</radialGradient>' +
                      '<linearGradient id="headingBeamLine" gradientUnits="userSpaceOnUse" x1="70" y1="70" x2="70" y2="12">' +
                        '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.75" />' +
                        '<stop offset="60%" stop-color="#ffffff" stop-opacity="0.3" />' +
                        '<stop offset="100%" stop-color="#ffffff" stop-opacity="0" />' +
                      '</linearGradient>' +
                    '</defs>' +
                    '<path d="M 70 70 L 36 11.11 A 68 68 0 0 1 104 11.11 Z" fill="url(#headingConeGrad)" />' +
                    '<path d="M 70 70 L 57.06 21.7 A 50 50 0 0 1 82.94 21.7 Z" fill="url(#headingCoreGrad)" />' +
                    '<line x1="70" y1="56" x2="70" y2="16" stroke="url(#headingBeamLine)" stroke-width="2" stroke-linecap="round" />' +
                  '</svg>' +
                '</div>' +
                '<div class="user-dot-ring"><div class="user-dot-core"></div></div>' +
              '</div>',
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

    function postToRN(payload) {
      try {
        var msg = JSON.stringify(payload);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(msg);
        } else {
          window.parent.postMessage(msg, '*');
        }
      } catch (e) {}
    }

    function iconFor(pin) {
      if (pin.type === 'user') return createUserIcon();
      if (pin.type === 'origin') return createOriginIcon();
      if (pin.type === 'destination') return createDestIcon();
      return createHazardIcon(pin.type);
    }

    function popupHtml(pin) {
      if (!pin.label && !pin.detail) return '';
      return '<b>' + (pin.label || '') + '</b>' +
        (pin.detail ? '<br/><span style="font-size:12px;color:#57503f">' + pin.detail + '</span>' : '');
    }

    function renderPins(nextPins) {
      var seen = {};
      nextPins.forEach(function (pin) {
        seen[pin.id] = true;
        var html = popupHtml(pin);
        var marker = markers[pin.id];
        if (marker) {
          marker.setLatLng([pin.position.lat, pin.position.lng]);
          if (html) {
            if (marker.getPopup()) marker.setPopupContent(html);
            else marker.bindPopup(html);
          }
          return;
        }
        marker = L.marker([pin.position.lat, pin.position.lng], { icon: iconFor(pin) });
        if (html) marker.bindPopup(html);
        marker.on('click', function () {
          postToRN({ type: 'onMarkerPress', id: pin.id });
        });
        marker.addTo(map);
        markers[pin.id] = marker;
      });
      Object.keys(markers).forEach(function (id) {
        if (!seen[id]) {
          map.removeLayer(markers[id]);
          delete markers[id];
        }
      });
    }

    function setRoute(coordinates) {
      if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
      }
      if (!coordinates || coordinates.length < 2) return;
      routeLayer = L.polyline(coordinates, {
        color: '#1f6f43',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    renderPins(pins);
    setRoute(routeCoords);

    map.on('click', function (e) {
      postToRN({ type: 'onMapPress', lat: e.latlng.lat, lng: e.latlng.lng });
    });

    function handleMessage(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'zoomIn') map.zoomIn();
        if (data.type === 'zoomOut') map.zoomOut();
        if (data.type === 'setCenter') map.flyTo([data.lat, data.lng], data.zoom || map.getZoom());
        if (data.type === 'panTo') map.panTo([data.lat, data.lng], { animate: true });
        if (data.type === 'setPins' && Array.isArray(data.pins)) renderPins(data.pins);
        if (data.type === 'setRoute' || data.type === 'drawRoute') setRoute(data.coordinates || []);
        if (data.type === 'setHeading') updateHeading(data.heading);
      } catch (e) {}
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
    postToRN({ type: 'ready' });
  </script>
</body>
</html>`;
}
// End Section Leaflet HTML Builder

// Section OneMapView Component
export default function OneMapView(props: OneMapViewProps) {
  const htmlRef = useRef<string | null>(null);
  if (htmlRef.current === null) htmlRef.current = buildLeafletHtml(props);
  const html = htmlRef.current;

  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isReadyRef = useRef(false);
  const propsRef = useRef(props);
  propsRef.current = props;

  const blobUrl = useMemo(() => {
    if (Platform.OS !== 'web') return '';
    return URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  }, [html]);

  useEffect(() => {
    if (!blobUrl) return;
    return () => URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  const postToMap = useCallback((msg: object) => {
    const payload = JSON.stringify(msg);
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(payload, '*');
      return;
    }
    webViewRef.current?.postMessage(payload);
  }, []);

  const flushMap = useCallback(() => {
    const current = propsRef.current;
    postToMap({ type: 'setPins', pins: current.pins ?? [] });
    postToMap({ type: 'setRoute', coordinates: current.routeCoordinates ?? [] });
    if (current.center) {
      postToMap({ type: 'panTo', lat: current.center.lat, lng: current.center.lng });
    }
    if (current.userHeading != null) {
      postToMap({ type: 'setHeading', heading: current.userHeading });
    }
  }, [postToMap]);

  const applyMapMessage = useCallback((data: { type?: string; id?: string; lat?: number; lng?: number }) => {
    if (data.type === 'ready') {
      isReadyRef.current = true;
      flushMap();
      return;
    }
    if (data.type === 'onMarkerPress' && data.id) propsRef.current.onMarkerPress?.(data.id);
    if (data.type === 'onMapPress' && data.lat != null && data.lng != null) {
      propsRef.current.onMapPress?.({ lat: data.lat, lng: data.lng });
    }
  }, [flushMap]);

  useEffect(() => {
    if (!props.mapRef) return;
    props.mapRef.current = {
      zoomIn: () => postToMap({ type: 'zoomIn' }),
      zoomOut: () => postToMap({ type: 'zoomOut' }),
      setCenter: (c) => postToMap({ type: 'setCenter', lat: c.lat, lng: c.lng }),
    };
  }, [postToMap, props.mapRef]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        applyMapMessage(data);
      } catch (_) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [applyMapMessage]);

  const pinsKey = JSON.stringify(props.pins ?? []);
  const routeKey = JSON.stringify(props.routeCoordinates ?? []);

  useEffect(() => {
    if (!isReadyRef.current) return;
    postToMap({ type: 'setPins', pins: propsRef.current.pins ?? [] });
  }, [pinsKey, postToMap]);

  useEffect(() => {
    if (!isReadyRef.current) return;
    postToMap({ type: 'setRoute', coordinates: propsRef.current.routeCoordinates ?? [] });
  }, [routeKey, postToMap]);

  useEffect(() => {
    if (!isReadyRef.current || !props.center) return;
    postToMap({ type: 'panTo', lat: props.center.lat, lng: props.center.lng });
  }, [props.center?.lat, props.center?.lng, postToMap]);

  useEffect(() => {
    if (!isReadyRef.current) return;
    postToMap({ type: 'setHeading', heading: propsRef.current.userHeading ?? null });
  }, [props.userHeading, postToMap]);

  const handleNativeMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      applyMapMessage(JSON.parse(event.nativeEvent.data));
    } catch (_) {}
  }, [applyMapMessage]);

  if (Platform.OS !== 'web') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const WebView = require('react-native-webview').default;
    return (
      <View style={oneMapStyles.mapContainer}>
        <WebView
          ref={webViewRef}
          style={oneMapStyles.webView}
          source={{ html }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleNativeMessage}
          scrollEnabled={false}
          allowsInlineMediaPlayback
        />
      </View>
    );
  }

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
