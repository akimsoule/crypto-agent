import { runDev } from '../main/runDev';

runDev()
  .then(() => console.log('runDev terminé'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
