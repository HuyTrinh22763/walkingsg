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
  /** Real-time compass heading in degrees (0-360) for user view cone */
  userHeading?: number | null;
  /** Steady bearing of the walking route segment ahead (0-360) for 3D POV camera lock */
  walkBearing?: number | null;
  /** Enable 3D POV walk-centered view */
  povMode?: boolean;
  /** Show dashed red out-of-bounds boundary ring */
  showOutOfBoundsBoundary?: boolean;
  /** Ref handle to imperatively call zoom in/out, recenter POV, or spread out route view */
  mapRef?: React.MutableRefObject<OneMapViewHandle | null>;
  onMarkerPress?: (id: string) => void;
  onMapPress?: (coords: LatLng) => void;
}

export interface OneMapViewHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  setCenter: (coords: LatLng, zoom?: number) => void;
  recenterPov: (coords: LatLng, walkBearing?: number | null) => void;
  spreadOutView: () => void;
}
// End Section OneMapView Types

// Section Leaflet HTML Builder
function buildLeafletHtml(props: OneMapViewProps): string {
  const center = props.center ?? { lat: 1.2966, lng: 103.8498 }; // Bencoolen St
  const zoom = props.zoom ?? 16;
  const route = props.routeCoordinates ?? [];
  const pins = props.pins ?? [];
  const showBoundary = props.showOutOfBoundsBoundary ?? false;
  const initialPov = props.povMode ?? false;

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
    html, body { width: 100%; height: 100%; overflow: hidden; background: #e7eed9; }
    #map-stage {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      perspective: 850px;
      background: #e7eed9;
    }
    #map {
      width: 100%;
      height: 100%;
      background: #e7eed9;
      transform-origin: 50% 50%;
      transition: transform 0.32s cubic-bezier(0.22, 0.8, 0.36, 1);
      will-change: transform;
    }
    #map.pov-mode {
      position: absolute;
      width: 280%;
      height: 280%;
      top: -90%;
      left: -90%;
    }
    .pin-billboard {
      transition: transform 0.3s cubic-bezier(0.22, 0.8, 0.36, 1);
      transform-origin: 50% 50%;
    }

    /* Custom pulsing user location dot and 3D navigation direction beam */
    @keyframes pulse {
      0%   { transform: scale(1);   opacity: 1; }
      50%  { transform: scale(1.6); opacity: 0.4; }
      100% { transform: scale(1);   opacity: 1; }
    }
    .user-pin-wrapper {
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-heading-cone {
      position: absolute;
      width: 150px;
      height: 150px;
      top: -57px;
      left: -57px;
      pointer-events: none;
      transform-origin: 75px 75px;
      transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.4, 1), opacity 0.25s ease;
      z-index: 1;
    }
    .user-dot-ring {
      position: relative;
      z-index: 2;
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(31,111,67,0.24);
      display: flex; align-items: center; justify-content: center;
      animation: pulse 2s infinite;
    }
    .user-dot-core {
      width: 18px; height: 18px; border-radius: 50%;
      background: #1f6f43; border: 3px solid #ffffff;
      box-shadow: 0 3px 10px rgba(31,111,67,0.85);
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
  <div id="map-stage">
    <div id="map" class="${initialPov ? 'pov-mode' : ''}"></div>
  </div>
  <script>
    // --- Map Init ---
    var map = L.map('map', {
      center: [${center.lat}, ${center.lng}],
      zoom: ${initialPov ? 18 : zoom},
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
        keepBuffer: 6,
      }
    );
    var osmFallback = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19, keepBuffer: 6 }
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
    var routeCasingLayer = null;
    var routeCoords = ${routeJson};
    var pins = ${pinsJson};
    var currentHeading = ${props.userHeading != null ? props.userHeading : 'null'};
    var currentAngle = ${props.userHeading != null ? props.userHeading : 'null'};
    var currentWalkBearing = ${props.walkBearing != null ? props.walkBearing : (props.userHeading != null ? props.userHeading : 0)};
    var currentWalkAngle = currentWalkBearing;
    var isPovMode = ${initialPov ? 'true' : 'false'};

    function unwrapAngle(targetDeg, current) {
      if (current === null || isNaN(current)) return targetDeg;
      var diff = (targetDeg - current) % 360;
      if (diff <= -180) diff += 360;
      if (diff > 180) diff -= 360;
      return current + diff;
    }

    // 3D Walk POV: tilts map in 3D and aligns steadily with the walk path (does NOT spin with user's compass)
    function applyPovTransform() {
      var mapEl = document.getElementById('map');
      if (!mapEl) return;
      var walkAngle = (currentWalkAngle !== null && !isNaN(currentWalkAngle)) ? currentWalkAngle : 0;
      if (isPovMode) {
        mapEl.style.transform = 'scale(1.22) rotateX(48deg) rotateZ(' + (-walkAngle) + 'deg)';
      } else {
        mapEl.style.transform = 'none';
      }
      var billboards = document.querySelectorAll('.pin-billboard');
      for (var i = 0; i < billboards.length; i++) {
        billboards[i].style.transform = isPovMode ? ('rotateZ(' + walkAngle + 'deg)') : 'none';
      }
    }

    function setPovMode(enabled, lat, lng, walkBearing) {
      var mapEl = document.getElementById('map');
      var prev = isPovMode;
      isPovMode = !!enabled;
      if (walkBearing !== undefined && walkBearing !== null && !isNaN(walkBearing)) {
        var normWalk = ((walkBearing % 360) + 360) % 360;
        currentWalkAngle = unwrapAngle(normWalk, currentWalkAngle);
      }
      if (mapEl) {
        if (isPovMode) mapEl.classList.add('pov-mode');
        else mapEl.classList.remove('pov-mode');
      }
      applyPovTransform();
      if (prev !== isPovMode) {
        setTimeout(function () {
          map.invalidateSize({ pan: false, animate: false });
          if (isPovMode) {
            var targetCenter = (lat != null && lng != null) ? [lat, lng] : map.getCenter();
            map.setView(targetCenter, 18, { animate: false });
          }
        }, 20);
      }
    }

    function updateWalkBearing(deg) {
      if (deg === null || deg === undefined || isNaN(deg)) return;
      var normalized = ((deg % 360) + 360) % 360;
      currentWalkAngle = unwrapAngle(normalized, currentWalkAngle);
      if (isPovMode) {
        applyPovTransform();
      }
    }

    // Updates ONLY the user's 3D view cone, never spinning the map
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
                  '<svg width="150" height="150" viewBox="0 0 150 150" style="overflow:visible;">' +
                    '<defs>' +
                      '<radialGradient id="headingConeGrad" gradientUnits="userSpaceOnUse" cx="75" cy="75" r="72" fx="75" fy="75">' +
                        '<stop offset="0%" stop-color="#1f6f43" stop-opacity="0.55" />' +
                        '<stop offset="40%" stop-color="#22c55e" stop-opacity="0.28" />' +
                        '<stop offset="75%" stop-color="#4ade80" stop-opacity="0.10" />' +
                        '<stop offset="100%" stop-color="#4ade80" stop-opacity="0" />' +
                      '</radialGradient>' +
                      '<radialGradient id="headingCoreGrad" gradientUnits="userSpaceOnUse" cx="75" cy="75" r="52" fx="75" fy="75">' +
                        '<stop offset="0%" stop-color="#1f6f43" stop-opacity="0.75" />' +
                        '<stop offset="45%" stop-color="#22c55e" stop-opacity="0.38" />' +
                        '<stop offset="100%" stop-color="#1f6f43" stop-opacity="0" />' +
                      '</radialGradient>' +
                    '</defs>' +
                    '<path d="M 75 75 L 38 11 A 72 72 0 0 1 112 11 Z" fill="url(#headingConeGrad)" />' +
                    '<path d="M 75 75 L 60 22 A 52 52 0 0 1 90 22 Z" fill="url(#headingCoreGrad)" />' +
                    '<polygon points="75,38 65,56 75,50 85,56" fill="#1f6f43" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" />' +
                  '</svg>' +
                '</div>' +
                '<div class="user-dot-ring"><div class="user-dot-core"></div></div>' +
              '</div>',
        className: '', iconSize: [36, 36], iconAnchor: [18, 18],
      });
    }
    function createOriginIcon() {
      return L.divIcon({
        html: '<div class="pin-billboard" style="width:16px;height:16px;border-radius:50%;background:#1f6f43;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(31,111,67,0.5)"></div>',
        className: '', iconSize: [16, 16], iconAnchor: [8, 8],
      });
    }
    function createDestIcon() {
      return L.divIcon({
        html: '<div class="pin-billboard" style="transform-origin: 50% 100%;"><svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z" fill="#a94c1c"/><circle cx="12" cy="12" r="5" fill="#fff"/></svg></div>',
        className: '', iconSize: [24, 32], iconAnchor: [12, 32],
      });
    }
    function createHazardIcon(type) {
      var cls = type === 'hazard' ? 'hazard-pin' : 'caution-pin';
      return L.divIcon({
        html: '<div class="pin-billboard ' + cls + '">!</div>',
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
      if (isPovMode) applyPovTransform();
    }

    function setRoute(coordinates) {
      if (routeCasingLayer) {
        map.removeLayer(routeCasingLayer);
        routeCasingLayer = null;
      }
      if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
      }
      if (!coordinates || coordinates.length < 2) return;
      routeCasingLayer = L.polyline(coordinates, {
        color: '#0f3d23',
        weight: 12,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      routeLayer = L.polyline(coordinates, {
        color: '#22c55e',
        weight: 7,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    renderPins(pins);
    setRoute(routeCoords);
    if (isPovMode) {
      applyPovTransform();
      setTimeout(function () {
        map.invalidateSize({ pan: false, animate: false });
        map.setView([${center.lat}, ${center.lng}], 18, { animate: false });
      }, 30);
    }

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
        if (data.type === 'setWalkBearing') updateWalkBearing(data.walkBearing);
        if (data.type === 'setPovMode') setPovMode(data.povMode, data.lat, data.lng, data.walkBearing);
        if (data.type === 'recenterPov') {
          setPovMode(true, data.lat, data.lng, data.walkBearing);
          setTimeout(function () {
            map.invalidateSize({ pan: false, animate: false });
            map.setView([data.lat, data.lng], 18, { animate: false });
          }, 30);
        }
        if (data.type === 'spreadOutView') {
          setPovMode(false);
          setTimeout(function () {
            map.invalidateSize({ pan: false, animate: false });
            if (routeLayer) {
              map.fitBounds(routeLayer.getBounds(), { padding: [60, 60], animate: true });
            } else {
              map.setZoom(15);
            }
          }, 30);
        }
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
    if (current.walkBearing != null) {
      postToMap({ type: 'setWalkBearing', walkBearing: current.walkBearing });
    }
    if (current.povMode != null) {
      postToMap({
        type: 'setPovMode',
        povMode: current.povMode,
        lat: current.center?.lat,
        lng: current.center?.lng,
        walkBearing: current.walkBearing,
      });
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
      setCenter: (c, z) => postToMap({ type: 'setCenter', lat: c.lat, lng: c.lng, zoom: z }),
      recenterPov: (c, wb) =>
        postToMap({
          type: 'recenterPov',
          lat: c.lat,
          lng: c.lng,
          walkBearing: wb ?? propsRef.current.walkBearing,
        }),
      spreadOutView: () => postToMap({ type: 'spreadOutView' }),
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

  useEffect(() => {
    if (!isReadyRef.current || props.walkBearing == null) return;
    postToMap({ type: 'setWalkBearing', walkBearing: props.walkBearing });
  }, [props.walkBearing, postToMap]);

  useEffect(() => {
    if (!isReadyRef.current) return;
    postToMap({
      type: 'setPovMode',
      povMode: !!props.povMode,
      lat: propsRef.current.center?.lat,
      lng: propsRef.current.center?.lng,
      walkBearing: propsRef.current.walkBearing,
    });
  }, [props.povMode, postToMap]);

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
