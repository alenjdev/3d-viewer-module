import { Universe } from "./Universe";
import { MarkerLayer } from "./layers/MarkerLayer";
import { UniverseDataContext } from "./UniverseDataContext";
import { GeometryLayer } from "./layers/GeometryLayer";
import { TransformLayer } from "./layers/TransformLayer";
import { DataSourceBuilder } from "./model/DataSourceBuilder";
import { PositioningBuilder } from "./model/PositioningBuilder";
import { GroundLayer } from "./layers/GroundLayer";
import { LayerDataContext } from "./LayerDataContext";
import { ExampleUniverseData } from "./ExampleUniverseData";
import { MapLayer } from "./layers/MapLayer";
import { RouteMakerLayer } from "./layers/RouteMakerLayer";
import { useEffect, useState } from "react";
import { Authentication, App as FormantApp } from "@formant/data-sdk";
import { parseDataSource, Viewer3DConfiguration } from "./config";
import {
  definedAndNotNull,
  IUniverseData,
  UniverseTelemetrySource,
} from "@formant/universe-core";
import { parsePositioning } from "./config";
import { TelemetryUniverseData } from "../../universe-connector/src/main";

const query = new URLSearchParams(window.location.search);
const demoMode = query.get("auth") === null;
const currentDeviceId = query.get("device");

function buildUniverse(config: Viewer3DConfiguration): React.ReactNode {
  const devices: React.ReactNode[] = [];
  let deviceLayers: React.ReactNode[] = [];
  (config.devices || []).forEach((device, di) => {
    const mapLayers = (device.mapLayers || []).map((layer, i) => {
      const positioning = layer.positioning
        ? parsePositioning(layer.positioning)
        : PositioningBuilder.fixed(0, 0, 0);
      if (layer.mapType === "Ground Plane") {
        return <GroundLayer key={"map" + i} positioning={positioning} />;
      }
      // Portland long lat
      const defaultLong = "-122.6765";
      const defaultLat = "45.5231";

      const dataSource = layer.dataSource && parseDataSource(layer.dataSource);
      return (
        <MapLayer
          key={"map" + i}
          positioning={positioning}
          mapType={layer.worldMapType || "Satellite"}
          size={parseFloat(layer.mapSize || "200")}
          latitude={parseFloat(layer.latitude || defaultLat)}
          longitude={parseFloat(layer.longitude || defaultLong)}
          mapBoxKey={layer.mapboxKey || ""}
          dataSource={dataSource as UniverseTelemetrySource}
        />
      );
    });
    (device.deviceVisualLayers || []).forEach((layer, i) => {
      const positioning = layer.positioning
        ? parsePositioning(layer.positioning)
        : PositioningBuilder.fixed(0, 0, 0);
      const dataSource = layer.dataSource && parseDataSource(layer.dataSource);
      if (layer.visualType === "Circle") {
        deviceLayers.push(
          <MarkerLayer key={"vis" + i} positioning={positioning} />
        );
      }
    });
    (device.geometryLayers || []).forEach((layer, i) => {
      const positioning = layer.positioning
        ? parsePositioning(layer.positioning)
        : PositioningBuilder.fixed(0, 0, 0);
      const dataSource = layer.dataSource && parseDataSource(layer.dataSource);
      if (dataSource) {
        deviceLayers.push(
          <GeometryLayer
            key={"geo" + i}
            positioning={positioning}
            dataSource={dataSource as UniverseTelemetrySource}
          />
        );
      }
    });
    devices.push(
      <LayerDataContext.Provider
        key={"data" + di}
        value={{
          deviceId: definedAndNotNull(currentDeviceId),
        }}
      >
        {mapLayers}
        {deviceLayers}
      </LayerDataContext.Provider>
    );
    deviceLayers = [];
  });
  return devices;
}

export function App() {
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [configuration, setConfiguration] = useState<
    Viewer3DConfiguration | undefined
  >();
  const [universeData] = useState<IUniverseData>(() => {
    return demoMode ? new ExampleUniverseData() : new TelemetryUniverseData();
  });
  useEffect(() => {
    if (demoMode) {
      return;
    }
    (async () => {
      await Authentication.waitTilAuthenticated();
      setAuthenticated(true);
      const currentConfig = await FormantApp.getCurrentModuleConfiguration();
      if (currentConfig) {
        setConfiguration(JSON.parse(currentConfig) as Viewer3DConfiguration);
      }
      FormantApp.addModuleConfigurationListener((config) => {
        setConfiguration(
          JSON.parse(config.configuration) as Viewer3DConfiguration
        );
      });
      FormantApp.addModuleDataListener((event) => {
        const d = new Date(event.time);
        universeData.setTime(d);
      });
    })();
  }, []);
  if (demoMode) {
    return (
      <UniverseDataContext.Provider value={universeData}>
        <Universe>
          <ambientLight />
          <GroundLayer positioning={PositioningBuilder.fixed(0, 0.1, 0)} />
          <LayerDataContext.Provider
            value={{
              deviceId: "ekobot_device",
            }}
          >
            <RouteMakerLayer size={200} />
            <MapLayer
              latitude={59.9139}
              longitude={10.7522}
              size={200}
              mapType="Satellite Street"
              mapBoxKey="pk.eyJ1IjoiYWJyYWhhbS1mb3JtYW50IiwiYSI6ImNrOWVuZm10NDA0M3MzZG53dWpjZ2k4d2kifQ.VOITHlgENYusw8tSYUlJ2w"
            />
            <TransformLayer
              positioning={PositioningBuilder.localization("eko.loc")}
            >
              <MarkerLayer
                positioning={PositioningBuilder.fixed(0.4, 0.1, 0.4)}
              />
              <GeometryLayer
                dataSource={DataSourceBuilder.telemetry("eko.geo", "json")}
              />
            </TransformLayer>
          </LayerDataContext.Provider>
        </Universe>
      </UniverseDataContext.Provider>
    );
  }
  if (authenticated && configuration) {
    return (
      <UniverseDataContext.Provider value={universeData}>
        <Universe>
          <ambientLight />
          {buildUniverse(configuration)};
        </Universe>
      </UniverseDataContext.Provider>
    );
  }
  return <div>no configuration</div>;
}