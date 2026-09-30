import pm2 from "pm2";
import config from "./ecosystem.config.js";

pm2.connect((error) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }

  pm2.start(config, (startError) => {
    pm2.disconnect();

    if (startError) {
      console.error(startError);
      process.exit(1);
    }
  });
});
