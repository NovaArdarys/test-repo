import { DeliveryUnit } from "../types/domain";
import calcDistance from "./calcDistanc";

export interface RealTimeETAInput {
  currentLat: number;
  currentLon: number;
  route: DeliveryUnit[];
  speedKmPerHour: number;
  handlingMinutesPerStop: number;
  currentTime?: Date;
}

export interface RealTimeETAOutput {
  route: (DeliveryUnit & {
    eta: Date;
    distanceFromLastNode: number;
    durationMinutes: number;
  })[];
}

export default function calcRealTimeETAs(
  input: RealTimeETAInput
): RealTimeETAOutput {

  const {
    currentLat,
    currentLon,
    route,
    speedKmPerHour,
    handlingMinutesPerStop,
  } = input;

  const now = input.currentTime ?? new Date();
  const speedKmPerMinute = speedKmPerHour / 60;

  let cursorLat = currentLat;
  let cursorLon = currentLon;
  let cursorTime = now;

  const results = [];

  for (const node of route) {

    const distance = calcDistance(
      String(cursorLat),
      String(cursorLon),
      String(node.lat),
      String(node.lon)
    );

    const duration = distance / speedKmPerMinute;

    cursorTime = new Date(cursorTime.getTime());
    cursorTime.setMinutes(cursorTime.getMinutes() + duration + handlingMinutesPerStop);

    results.push({
      ...node,
      eta: cursorTime,
      distanceFromLastNode: distance,
      durationMinutes: duration + handlingMinutesPerStop,
    });

    cursorLat = Number(node.lat);
    cursorLon = Number(node.lon);
  }

  return { route: results };
}
