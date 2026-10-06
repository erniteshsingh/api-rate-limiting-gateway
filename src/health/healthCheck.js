import services from "../config/services.js";

const checkService = async (serviceName, serviceUrl) => {
  try {
    const healthUrl = `${serviceUrl}/health`;

    console.log(`Checking ${serviceName}: ${healthUrl}`);

    const response = await fetch(healthUrl);

    console.log(`${serviceName} response:`, response.status);

    if (!response.ok) {
      return {
        service: serviceName,
        status: "unhealthy",
      };
    }

    return {
      service: serviceName,
      status: "healthy",
    };
  } catch (error) {
    console.error(`${serviceName} health check error:`, error.message);

    console.error("Error cause:", error.cause);

    console.error("Error stack:", error.stack);

    return {
      service: serviceName,
      status: "unhealthy",
    };
  }
};

const checkAllServices = async () => {
  const results = await Promise.all([
    checkService("Product Service", services.products.url),

    checkService("User Service", services.users.url),

    checkService("Order Service", services.orders.url),
  ]);

  return results;
};

const startHealthCheck = () => {
  const runHealthCheck = async () => {
    const results = await checkAllServices();

    console.log("Service Health:");

    results.forEach((result) => {
      console.log(`${result.service}: ${result.status}`);
    });
  };

  runHealthCheck();

  setInterval(runHealthCheck, 30000);
};

export default startHealthCheck;
