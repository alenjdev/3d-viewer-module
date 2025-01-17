import { Cylinder, GradientTexture, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Interactive } from "@react-three/xr";
import { useRef, useState } from "react";
import { FormantColors } from "./utils/FormantColors";
import { DataVisualizationLayer } from "./DataVisualizationLayer";
import { IUniverseLayerProps } from "./types";
import { LayerType } from "./common/LayerTypes";

interface IMapLayer extends IUniverseLayerProps {
  size: number;
}

function Marker(props: { color: string; position: [number, number, number] }) {
  const { position, color } = props;
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((state, delta) => {
    const g = groupRef.current;
    if (g) {
      g.rotateY(delta * 0.1);
    }
  });
  return (
    <group ref={groupRef} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.26, 0]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial>
          <GradientTexture
            stops={[0, 1]}
            colors={FormantColors.gradient01}
            size={1024}
          />
        </meshBasicMaterial>
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

export function RouteMakerLayer(props: IMapLayer) {
  const [points, setPoints] = useState<[number, number, number][]>([]);
  const { children, size } = props;

  return (
    <DataVisualizationLayer {...props} type={LayerType.ROUTE}>
      <Interactive
        onSelect={(e) => {
          const p = e.intersection?.point;
          if (p) {
            setPoints([...points, [p.x, p.y, p.z]]);
          }
        }}
      >
        <mesh
          onPointerDown={(e) => {
            let p = e.point;
            setPoints([...points, [p.x, p.y, p.z + 1]]);
          }}
        >
          <boxGeometry args={[size, size, 0.1]} />
          <meshPhongMaterial opacity={0} transparent />
        </mesh>
      </Interactive>
      {points.map((p: [number, number, number], i) => {
        const v: [number, number, number] = p;
        let lastv: [number, number, number] | undefined;
        if (i > 0) {
          lastv = points[i - 1];
        }
        return (
          <group key={i}>
            {i > 0 && lastv !== undefined && (
              <Line
                points={[v, lastv]}
                color={FormantColors.silver}
                lineWidth={5}
              />
            )}
            <Marker
              color={i === 0 ? FormantColors.green : FormantColors.silver}
              position={v}
            />
          </group>
        );
      })}
      {children}
    </DataVisualizationLayer>
  );
}
