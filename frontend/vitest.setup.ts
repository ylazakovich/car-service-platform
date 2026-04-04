import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import * as allure from "allure-js-commons";

beforeEach(async () => {
  await allure.epic("unit");
});
