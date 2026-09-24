const services = {
  products: {
    name: "Product Service",
    url: process.env.PRODUCT_SERVICE_URL,
  },

  users: {
    name: "User Service",
    url: process.env.USER_SERVICE_URL,
  },
  orders: {
    name: "Order Service",
    url: process.env.ORDER_SERVICE_URL,
  },
};

export default services;
