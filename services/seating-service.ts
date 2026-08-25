import { api } from './api-client';

export type CanvasDeskSeat = {
  position: number;
  studentId?: string | null;
  student?: any;
  stale?: boolean;
};

export type CanvasDesk = {
  id: string;
  name: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  seatCapacity: number;
  seats: CanvasDeskSeat[];
};

export type CanvasGroup = {
  id: string;
  name: string;
  desks: CanvasDesk[];
};

export type CanvasLayout = {
  canvas?: {
    width?: number;
    height?: number;
  };
  groups?: CanvasGroup[];
  desks?: CanvasDesk[];
};

export type SeatingPosition = {
  studentId: string;
  row: number;
  column: number;
  seatIndex?: number;
  student?: any;
  stale?: boolean;
};

export type SeatingPlan = {
  id: string;
  classroomId: string;
  name: string;
  rows?: number;
  columns?: number;
  seatsPerDesk?: number;
  layout: CanvasLayout | SeatingPosition[] | any;
  students: any[];
  updatedAt?: string;
};

export async function getSeatingPlans(classroomId: string) {
  return api.get<SeatingPlan[]>('/seating-plans?classroomId=' + encodeURIComponent(classroomId));
}
export async function createSeatingPlan(data: any) {
  return api.post<SeatingPlan>('/seating-plans', data);
}
export async function updateSeatingPlan(id: string, data: any) {
  return api.patch<SeatingPlan>('/seating-plans/' + id, data);
}
export async function randomizeSeatingPlan(id: string) {
  return api.post<SeatingPlan>('/seating-plans/' + id + '/randomize', {});
}
export async function resetSeatingPlan(id: string) {
  return api.post<SeatingPlan>('/seating-plans/' + id + '/reset', {});
}

