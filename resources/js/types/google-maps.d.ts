// resources/js/types/google-maps.d.ts

declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: Element | null, opts?: MapOptions);
      setCenter(latlng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      setMapTypeId(mapTypeId: MapTypeId | string): void;
      addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
      getCenter(): LatLng;
      getZoom(): number;
      getBounds(): LatLngBounds | null;
      fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral): void;
    }

    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      mapTypeId?: MapTypeId | string;
      streetViewControl?: boolean;
      mapTypeControl?: boolean;
      fullscreenControl?: boolean;
      zoomControl?: boolean;
      gestureHandling?: 'cooperative' | 'greedy' | 'none' | 'auto';
      disableDefaultUI?: boolean;
      styles?: MapTypeStyle[];
    }

    interface MapTypeStyle {
      elementType?: string;
      featureType?: string;
      stylers?: Array<{ [key: string]: any }>;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
      setPosition(latlng: LatLng | LatLngLiteral): void;
      getPosition(): LatLng | null;
      setTitle(title: string): void;
      getTitle(): string;
      setIcon(icon: Icon | Symbol | string | null): void;
      setVisible(visible: boolean): void;
      addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
    }

    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map | null;
      title?: string;
      icon?: Icon | Symbol | string | null;
      visible?: boolean;
      clickable?: boolean;
      draggable?: boolean;
      animation?: Animation;
    }

    enum Animation {
      BOUNCE = 1,
      DROP = 2
    }

    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      open(map?: Map | StreetViewPanorama, anchor?: MVCObject): void;
      close(): void;
      setContent(content: string | Element | null): void;
      getContent(): string | Element | null;
      setPosition(position: LatLng | LatLngLiteral): void;
      getPosition(): LatLng | null;
    }

    interface InfoWindowOptions {
      content?: string | Element | null;
      position?: LatLng | LatLngLiteral;
      pixelOffset?: Size;
      maxWidth?: number;
      disableAutoPan?: boolean;
    }

    class TrafficLayer {
      constructor(opts?: TrafficLayerOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
    }

    interface TrafficLayerOptions {
      autoRefresh?: boolean;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
      equals(other: LatLng): boolean;
      toString(): string;
      toJSON(): LatLngLiteral;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    class LatLngBounds {
      constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
      contains(latLng: LatLng | LatLngLiteral): boolean;
      extend(point: LatLng | LatLngLiteral): LatLngBounds;
      getCenter(): LatLng;
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
      isEmpty(): boolean;
      toJSON(): LatLngBoundsLiteral;
      toString(): string;
    }

    interface LatLngBoundsLiteral {
      east: number;
      north: number;
      south: number;
      west: number;
    }

    interface Icon {
      url: string;
      scaledSize?: Size;
      size?: Size;
      origin?: Point;
      anchor?: Point;
    }

    interface Symbol {
      path: SymbolPath | string;
      scale?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
      strokeOpacity?: number;
      anchor?: Point;
      rotation?: number;
    }

    class Size {
      constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
      width: number;
      height: number;
      toString(): string;
      equals(other: Size): boolean;
    }

    class Point {
      constructor(x: number, y: number);
      x: number;
      y: number;
      toString(): string;
      equals(other: Point): boolean;
    }

    enum SymbolPath {
      CIRCLE = 0,
      FORWARD_CLOSED_ARROW = 1,
      FORWARD_OPEN_ARROW = 2,
      BACKWARD_CLOSED_ARROW = 3,
      BACKWARD_OPEN_ARROW = 4
    }

    enum MapTypeId {
      HYBRID = 'hybrid',
      ROADMAP = 'roadmap',
      SATELLITE = 'satellite',
      TERRAIN = 'terrain'
    }

    interface MapsEventListener {
      remove(): void;
    }

    class MVCObject {
      addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
      get(key: string): any;
      set(key: string, value: any): void;
    }

    class StreetViewPanorama extends MVCObject {
      constructor(container: Element, opts?: StreetViewPanoramaOptions);
    }

    interface StreetViewPanoramaOptions {
      position?: LatLng | LatLngLiteral;
      pov?: StreetViewPov;
      zoom?: number;
      visible?: boolean;
    }

    interface StreetViewPov {
      heading?: number;
      pitch?: number;
    }

    // Geometry library
    namespace geometry {
      namespace spherical {
        function computeDistanceBetween(from: LatLng, to: LatLng, radius?: number): number;
        function computeHeading(from: LatLng, to: LatLng): number;
        function computeLength(path: LatLng[], radius?: number): number;
        function computeArea(path: LatLng[], radius?: number): number;
        function interpolate(from: LatLng, to: LatLng, fraction: number): LatLng;
      }
    }

    // Places library (if needed)
    namespace places {
      class PlacesService {
        constructor(attrContainer: HTMLDivElement | Map);
        findPlaceFromQuery(request: FindPlaceFromQueryRequest, callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void): void;
        nearbySearch(request: PlaceSearchRequest, callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void): void;
      }

      interface FindPlaceFromQueryRequest {
        query: string;
        fields: string[];
        locationBias?: LocationBias;
      }

      interface PlaceSearchRequest {
        location: LatLng | LatLngLiteral;
        radius: number;
        type?: string;
        keyword?: string;
      }

      interface PlaceResult {
        place_id?: string;
        name?: string;
        geometry?: PlaceGeometry;
        vicinity?: string;
        types?: string[];
      }

      interface PlaceGeometry {
        location: LatLng;
        viewport: LatLngBounds;
      }

      type LocationBias = LatLng | LatLngLiteral | LatLngBounds | LatLngBoundsLiteral | Circle;

      interface Circle {
        center: LatLng | LatLngLiteral;
        radius: number;
      }

      enum PlacesServiceStatus {
        INVALID_REQUEST = 'INVALID_REQUEST',
        NOT_FOUND = 'NOT_FOUND',
        OK = 'OK',
        OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
        REQUEST_DENIED = 'REQUEST_DENIED',
        UNKNOWN_ERROR = 'UNKNOWN_ERROR',
        ZERO_RESULTS = 'ZERO_RESULTS'
      }
    }

    // Event handling
    namespace event {
      function addListener(instance: any, eventName: string, handler: (...args: any[]) => void): MapsEventListener;
      function removeListener(listener: MapsEventListener): void;
      function clearInstanceListeners(instance: any): void;
      function trigger(instance: any, eventName: string, ...args: any[]): void;
    }
  }
}

export {};