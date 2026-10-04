const rateLimits = {
    free: {
      capacity: 5,
      refillRate: 1,
    },
  
    pro: {
      capacity: 10,
      refillRate: 2,
    },
  
    enterprise: {
      capacity: 20,
      refillRate: 5,
    },
  };
  
  export default rateLimits;