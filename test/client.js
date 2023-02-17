const { Controller } = require("ethernet-ip");

const server = new Controller();

server.connect("localhost").then(() => {
  console.log("server connected");
});
