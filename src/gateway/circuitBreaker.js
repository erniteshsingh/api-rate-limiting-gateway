const circuits = new Map();

const FAILURE_THRESHOLD = 3;
const OPEN_DURATION = 10000;

const getCircuit = (serviceName) => {
  if (!circuits.has(serviceName)) {
    circuits.set(serviceName, {
      state: "CLOSED",
      failures: 0,
      openedAt: null,
    });
  }

  return circuits.get(serviceName);
};

const recordFailure = (serviceName) => {
  const circuit = getCircuit(serviceName);

  circuit.failures += 1;

  console.log(`${serviceName} failure count: ${circuit.failures}`);

  if (circuit.failures >= FAILURE_THRESHOLD) {
    circuit.state = "OPEN";
    circuit.openedAt = Date.now();

    console.log(`${serviceName} circuit OPEN`);
  }
};

const recordSuccess = (serviceName) => {
  const circuit = getCircuit(serviceName);

  circuit.state = "CLOSED";
  circuit.failures = 0;
  circuit.openedAt = null;

  console.log(`${serviceName} circuit CLOSED`);
};

const canRequest = (serviceName) => {
  const circuit = getCircuit(serviceName);

  if (circuit.state === "CLOSED") {
    return true;
  }

  if (circuit.state === "OPEN") {
    const elapsedTime = Date.now() - circuit.openedAt;

    if (elapsedTime >= OPEN_DURATION) {
      circuit.state = "HALF-OPEN";

      console.log(`${serviceName} circuit HALF-OPEN`);

      return true;
    }

    return false;
  }

  if (circuit.state === "HALF-OPEN") {
    return true;
  }

  return false;
};

export {
  getCircuit,
  recordFailure,
  recordSuccess,
  canRequest,
  FAILURE_THRESHOLD,
  OPEN_DURATION,
};
