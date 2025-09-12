import { runDev } from '../main/Second/Prod/runDev';

runDev()
  .then(() => console.log('runDev terminé'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
