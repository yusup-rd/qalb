import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("pages/Home.tsx"),
  route("ru", "pages/Home.tsx", { id: "home-ru" }),
  route("support/ru?", "pages/Support.tsx"),
  route("privacy/:language?", "pages/Privacy.tsx"),
  route("terms/:language?", "pages/Terms.tsx"),
  route("*", "pages/NotFound.tsx"),
] satisfies RouteConfig;
