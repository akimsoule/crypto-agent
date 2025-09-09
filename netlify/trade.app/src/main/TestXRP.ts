import { HandlerEvent } from "@netlify/functions";

import { Profile } from "../package/common/MapperType";
import { runner as eos } from "./Main/Sim/MainAccSimFutureXRP";


// eslint-disable-next-line @typescript-eslint/no-unused-vars
const runner = async (event: HandlerEvent) => {
  await runners([Profile.PROD]);
};


async function runners(profils: Profile[]) {
  await eos(profils);
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

export { runner };
