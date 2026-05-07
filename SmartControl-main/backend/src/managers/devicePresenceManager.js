import { getAvailabilityState } from '../protocols/smartcontrolProtocol.js';

const PRESENCE_EVENT_TYPES = new Set(['status', 'telemetry', 'heartbeat', 'ack', 'availability']);
const STATE_REPLACEMENT_EVENT_TYPES = new Set(['status', 'telemetry', 'heartbeat']);
const COMMAND_METADATA_KEYS = [
  'last_ack',
  'last_ack_at',
  'last_command_status',
  'last_command_reason',
  'last_command_at',
  'pending_command',
  'pending_command_payload',
  'pending_command_at',
  'pending_command_topic',
  'pending_command_module',
  'pending_command_user_id',
  'pending_request_id',
  'pending_command_expires_at',
];

const pickCommandMetadata = (state = {}) =>
  COMMAND_METADATA_KEYS.reduce((acc, key) => {
    if (state[key] !== undefined && state[key] !== null) acc[key] = state[key];
    return acc;
  }, {});

const clearPendingCommand = (state = {}) => {
  const next = { ...state };
  delete next.pending_command;
  delete next.pending_command_payload;
  delete next.pending_command_at;
  delete next.pending_command_topic;
  delete next.pending_command_module;
  delete next.pending_command_user_id;
  delete next.pending_request_id;
  delete next.pending_command_expires_at;
  return next;
};

const buildAckPatch = ({ payload = {}, previousLastState = {}, previousTelemetry = {}, now }) => {
  const accepted = payload.accepted !== false;
  const ack = {
    ...payload,
    accepted,
    received_at: now,
    server_received_at: now,
  };
  const requestId = payload.request_id || payload.requestId || '';
  const previousRequestId = previousLastState.pending_request_id || previousTelemetry.pending_request_id || '';
  const matchesPending = requestId && previousRequestId && requestId === previousRequestId;
  const base = {
    last_ack: ack,
    last_ack_at: now,
    last_command_status: accepted ? 'confirmed' : 'rejected',
    last_command_reason: payload.reason || (accepted ? 'ok' : 'rejected'),
    last_command_at: now,
  };

  return {
    patch: base,
    clearPending: matchesPending || !previousRequestId,
    ack,
  };
};

export const resolvePresence = ({ eventType, payload = {} }) => {
  const availabilityState = getAvailabilityState(eventType, payload);
  const isPresenceEvent = PRESENCE_EVENT_TYPES.has(eventType) || availabilityState !== null;

  if (!isPresenceEvent) {
    return {
      isPresenceEvent: false,
      online: null,
      source: eventType,
      offlineReason: null,
      refreshHeartbeat: false,
    };
  }

  const online = availabilityState === false ? false : true;

  return {
    isPresenceEvent: true,
    online,
    source: eventType,
    offlineReason: online ? null : payload.reason || payload.offline_reason || 'mqtt_lwt',
    refreshHeartbeat: online,
  };
};

export const buildPresenceUpdate = ({
  eventType,
  payload = {},
  previousLastState = {},
  previousTelemetry = {},
  now,
}) => {
  const presence = resolvePresence({ eventType, payload });

  if (!presence.isPresenceEvent) {
    return {
      presence,
      update: {},
    };
  }

  const basePresence = {
    online: presence.online,
    connection_status: presence.online ? 'online' : 'offline',
    last_seen: now,
    last_seen_at: now,
    presence_source: presence.source,
    offline_reason: presence.offlineReason,
  };

  if (presence.online) {
    basePresence.last_online_at = now;
    basePresence.last_heartbeat_at = now;
  } else {
    basePresence.last_offline_at = now;
  }

  const replacesDeviceState = STATE_REPLACEMENT_EVENT_TYPES.has(eventType);
  const commandMetadata = {
    ...pickCommandMetadata(previousTelemetry),
    ...pickCommandMetadata(previousLastState),
  };
  const serverPatch = {
    server_received_at: now,
    state_reported_at: payload.sent_at || payload.published_at || payload.created_at || now,
  };
  const ackPatch = eventType === 'ack'
    ? buildAckPatch({ payload, previousLastState, previousTelemetry, now })
    : null;

  let nextLastState = replacesDeviceState
    ? {
        ...payload,
        ...commandMetadata,
        ...basePresence,
        ...serverPatch,
      }
    : {
        ...previousLastState,
        ...basePresence,
        ...serverPatch,
        last_availability: eventType === 'availability' ? payload : previousLastState.last_availability,
      };

  if (ackPatch) {
    nextLastState = {
      ...nextLastState,
      ...ackPatch.patch,
    };
    if (ackPatch.clearPending) nextLastState = clearPendingCommand(nextLastState);
  }

  let nextTelemetry = replacesDeviceState
    ? {
        ...payload,
        ...commandMetadata,
        ...basePresence,
        ...serverPatch,
      }
    : {
        ...previousTelemetry,
        ...basePresence,
        ...serverPatch,
        last_availability: eventType === 'availability' ? payload : previousTelemetry.last_availability,
      };

  if (ackPatch) {
    nextTelemetry = {
      ...nextTelemetry,
      ...ackPatch.patch,
    };
    if (ackPatch.clearPending) nextTelemetry = clearPendingCommand(nextTelemetry);
  }

  const update = {
    connection_status: presence.online ? 'online' : 'offline',
    online: presence.online,
    last_state: nextLastState,
    telemetry: nextTelemetry,
  };

  if (presence.refreshHeartbeat) {
    update.last_heartbeat = now;
  }

  return {
    presence,
    update,
  };
};

export const isHeartbeatStale = (lastHeartbeat, timeoutMs, nowMs = Date.now()) => {
  if (!lastHeartbeat) return false;
  const heartbeatMs = new Date(lastHeartbeat).getTime();
  if (!Number.isFinite(heartbeatMs)) return false;
  return heartbeatMs < nowMs - timeoutMs;
};
