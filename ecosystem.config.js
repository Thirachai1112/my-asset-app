module.exports = {
  apps: [
    {
      name: "my-asset-app",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3000",
      env: {
        NODE_TLS_REJECT_UNAUTHORIZED: "0"
      }
    }
  ]
};