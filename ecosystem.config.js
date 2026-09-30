export default {
  apps: [
    {
      name: "insuredmine",
      script: "src/server.js",
      autorestart: true,
      watch: false,
      restart_delay: 2000,
    },
  ],
};
