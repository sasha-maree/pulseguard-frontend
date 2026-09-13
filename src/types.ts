export interface Heartbeat {
    id: string;
    monitorId: string;
    statusCode: number | null;
    latencyMs: number;
    isUp: boolean;
    error: string | null;
    createdAt: string;
}

export interface Monitor {
    id: string;
    name: string;
    url: string;
    intervalSeconds: number;
    status: "UP" | "DOWN" | "DEGRADED" | "PENDING";
    consecutiveFails: number;
    lastCheckedAt: string | null;
    createdAt: string;
    updatedAt: string;
    heartbeats?: Heartbeat[];
}