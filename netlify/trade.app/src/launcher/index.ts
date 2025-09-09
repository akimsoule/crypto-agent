import { runner } from "../main/Main/Sim/MainAccSimFutureXRP";
import { Profile } from "../package/common/MapperType";

runner([Profile.DEV]).then(() => {
  console.log("Runner completed");
});
