import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import * as allure from "allure-js-commons";
import { allureFeatureFromFrontendPath } from "./vitest.allure-helpers";

beforeEach(async (ctx) => {
  await allure.epic("unit");
  const fp = ctx.task.file.filepath;
  await allure.feature(allureFeatureFromFrontendPath(fp));
});
