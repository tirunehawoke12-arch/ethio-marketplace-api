var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var templates_exports = {};
__export(templates_exports, {
  FIELD_TYPES: () => FIELD_TYPES,
  TEMPLATES: () => TEMPLATES,
  THEMES: () => THEMES,
  VISITOR_PRESETS: () => VISITOR_PRESETS,
  blankField: () => blankField,
  blankFormField: () => blankFormField,
  blankSection: () => blankSection,
  themeColor: () => themeColor,
  themeGrad: () => themeGrad
});
module.exports = __toCommonJS(templates_exports);
let n = 0;
const id = () => "f" + Date.now().toString(36) + (n++).toString(36);
const F = (label, type = "text", o = {}) => ({ id: id(), label, type, hint: "", required: false, options: [], priv: false, value: type === "multi" || type === "image" ? [] : "", ...o });
const S = (icon, title, fields) => ({ id: id(), icon, title, fields });
const FIELD_TYPES = [
  ["text", "\u270F\uFE0F \u12A0\u132D\u122D \u133D\u1211\u134D"],
  ["long", "\u{1F4DD} \u1228\u1305\u121D \u133D\u1211\u134D"],
  ["number", "\u{1F522} \u1241\u1325\u122D"],
  ["phone", "\u{1F4DE} \u1235\u120D\u12AD"],
  ["link", "\u{1F517} \u120A\u1295\u12AD"],
  ["date", "\u{1F4C5} \u1240\u1295"],
  ["choice", "\u{1F518} \u12A0\u1295\u12F5 \u121D\u122D\u132B"],
  ["multi", "\u2611\uFE0F \u1265\u12D9 \u121D\u122D\u132B"],
  ["yesno", "\u2705 \u12A0\u12CE / \u12A0\u12ED\u12F0\u1208\u121D"],
  ["image", "\u{1F5BC}\uFE0F \u134E\u1276"]
];
const THEMES = {
  green: ["#0a8a56", "#0b6e8f", "\u12A0\u1228\u1295\u1313\u12F4"],
  ocean: ["#0b6e8f", "#2b4acb", "\u12CD\u1245\u12EB\u1296\u1235"],
  sunset: ["#e8590c", "#c2255c", "\u1340\u1210\u12ED \u1218\u1325\u1208\u1242\u12EB"],
  royal: ["#6741d9", "#364fc7", "\u1210\u121D\u122B\u12CA"],
  rose: ["#d6336c", "#ae3ec9", "\u133D\u130C\u1228\u12F3"],
  night: ["#212529", "#495057", "\u120C\u120A\u1275"],
  gold: ["#b8860b", "#e67700", "\u12C8\u122D\u1245"]
};
const themeGrad = (t) => {
  const c = THEMES[t] || THEMES.green;
  return `linear-gradient(135deg, ${c[0]}, ${c[1]})`;
};
const themeColor = (t) => (THEMES[t] || THEMES.green)[0];
const PAYMENT = () => S("\u{1F4B3}", "\u12AD\u134D\u12EB \u12A5\u1293 \u12E8\u1263\u1295\u12AD \u1218\u1228\u1303", [
  F("\u12E8\u12AD\u134D\u12EB \u1218\u1240\u1260\u12EB \u12D8\u12F4", "choice", { options: ["telebirr", "CBE Birr", "\u1295\u130D\u12F5 \u1263\u1295\u12AD", "\u12A0\u12CB\u123D \u1263\u1295\u12AD", "\u12F3\u123D\u1295 \u1263\u1295\u12AD", "\u12A0\u1262\u1232\u1292\u12EB \u1263\u1295\u12AD", "\u120C\u120B"], priv: true }),
  F("\u12E8\u12A0\u12AB\u12CD\u1295\u1275 / \u12E8\u1235\u120D\u12AD \u1241\u1325\u122D", "text", { priv: true }),
  F("\u12E8\u12A0\u12AB\u12CD\u1295\u1275 \u1263\u1208\u1264\u1275 \u1235\u121D", "text", { priv: true }),
  F("\u12E8\u121A\u1240\u1260\u120F\u1278\u12CD \u12E8\u12AD\u134D\u12EB \u12D8\u12F4\u12CE\u127D", "multi", { options: ["\u1325\u122C \u1308\u1295\u12D8\u1265", "telebirr", "\u1263\u1295\u12AD \u121B\u1235\u1270\u120B\u1208\u134D", "\u12AB\u122D\u12F5"] })
]);
const ADDRESS = () => S("\u{1F4CD}", "\u12A0\u12F5\u122B\u123B", [
  F("\u12AD\u120D\u120D", "text"),
  F("\u12DE\u1295 / \u12AD\u134D\u1208 \u12A8\u1270\u121B", "text"),
  F("\u12C8\u1228\u12F3 / \u1240\u1260\u120C", "text"),
  F("\u12A8\u1270\u121B", "text"),
  F("\u12DD\u122D\u12DD\u122D \u12A0\u12F5\u122B\u123B / \u121D\u120D\u12AD\u1275", "long"),
  F("\u12E8\u12AB\u122D\u1273 \u120A\u1295\u12AD (Google Maps)", "link"),
  F("\u12E8\u1225\u122B \u1230\u12D3\u1275", "text", { hint: "\u1208\u121D\u1233\u120C \u1230\u129E\u2013\u1245\u12F3\u121C 2:00\u201312:00" })
]);
const CONTACT = () => S("\u260E\uFE0F", "\u121B\u130D\u129B", [F("\u1235\u120D\u12AD", "phone"), F("Telegram", "link", { hint: "@username \u12C8\u12ED\u121D \u120A\u1295\u12AD" }), F("Facebook", "link"), F("TikTok / Instagram", "link"), F("\u12F5\u1228-\u1308\u133D", "link")]);
const ABOUT_ME = () => S("\u{1F64B}", "\u1235\u1208 \u12A5\u1294", [F("\u1219\u1209 \u1235\u121D", "text", { required: true }), F("\u1235\u1208 \u12A5\u1294 \u12A0\u132D\u122D \u1218\u130D\u1208\u132B", "long"), F("\u12D5\u12F5\u121C \u12AD\u120D\u120D", "choice", { options: ["18\u201325", "26\u201335", "36\u201345", "46+"] }), F("\u124B\u1295\u124B\u12CE\u127D", "multi", { options: ["\u12A0\u121B\u122D\u129B", "\u12A6\u122E\u121D\u129B", "\u1275\u130D\u122D\u129B", "\u1236\u121B\u120A\u129B", "\u1232\u12F3\u121D\u129B", "\u12A5\u1295\u130D\u120A\u12DD\u129B", "\u12D0\u1228\u1265\u129B"] })]);
const ID_PRIV = () => S("\u{1FAAA}", "\u1218\u1273\u12C8\u1242\u12EB (\u1208\u12A0\u12F5\u121A\u1295 \u1265\u127B)", [F("\u12E8\u1218\u1273\u12C8\u1242\u12EB \u12D3\u12ED\u1290\u1275", "choice", { options: ["\u1240\u1260\u120C \u1218\u1273\u12C8\u1242\u12EB", "\u1353\u1235\u1356\u122D\u1275", "\u1218\u1295\u1303 \u1348\u1243\u12F5", "\u1265\u1214\u122B\u12CA \u1218\u1273\u12C8\u1242\u12EB"], priv: true }), F("\u12E8\u1218\u1273\u12C8\u1242\u12EB \u134E\u1276", "image", { priv: true }), F("\u12E8\u1295\u130D\u12F5 \u1348\u1243\u12F5 \u1241\u1325\u122D", "text", { priv: true })]);
const TEMPLATES = [
  { key: "worker", icon: "\u{1F9D1}\u200D\u{1F527}", kind: "\u1220\u122B\u1270\u129B", name: "\u1220\u122B\u1270\u129B / \u1219\u12EB\u1270\u129B", tagline: "\u1219\u12EB\u12EC\u1295 \u12EB\u1233\u12E9 \u2014 \u1225\u122B \u12EB\u130D\u1299", build: () => [
    ABOUT_ME(),
    S("\u{1F6E0}\uFE0F", "\u1235\u1208 \u1225\u122B\u12EC", [F("\u1219\u12EB", "text", { required: true }), F("\u12D8\u122D\u134D", "choice", { options: ["\u130D\u1295\u1263\u1273", "\u1325\u1308\u1293 \u12A5\u1293 \u1274\u12AD\u1292\u12AD", "\u1275\u121D\u1205\u122D\u1275", "\u1324\u1293", "\u1239\u134C\u122D", "\u121D\u130D\u1265 \u121B\u1265\u1230\u120D", "\u133D\u12F3\u1275", "\u12F0\u1205\u1295\u1290\u1275", "\u1274\u12AD\u1296\u120E\u1302", "\u120C\u120B"] }), F("\u12AD\u1205\u120E\u1276\u127D", "long"), F("\u12E8\u120D\u121D\u12F5 \u12D3\u1218\u1275", "number"), F("\u1275\u121D\u1205\u122D\u1275", "text"), F("\u12E8\u1225\u122B \u1293\u1219\u1293 \u134E\u1276\u12CE\u127D", "image"), F("\u12E8\u121A\u1320\u12ED\u1241\u1275 \u12AD\u134D\u12EB (\u1265\u122D)", "number"), F("\u12AD\u134D\u12EB \u12E8\u121A\u1230\u120B\u12CD \u1260", "choice", { options: ["\u1230\u12D3\u1275", "\u1240\u1295", "\u12C8\u122D", "\u1225\u122B"] }), F("\u1208\u1225\u122B \u12DD\u130D\u1301 \u1290\u129D", "yesno")]),
    ADDRESS(),
    PAYMENT(),
    CONTACT(),
    ID_PRIV()
  ] },
  { key: "employer", icon: "\u{1F3E2}", kind: "\u12A0\u1230\u122A", name: "\u12A0\u1230\u122A / \u12F5\u122D\u1305\u1275", tagline: "\u1265\u1241 \u1220\u122B\u1270\u129B \u12ED\u1348\u120D\u130B\u1209?", build: () => [
    S("\u{1F3E2}", "\u1235\u1208 \u12F5\u122D\u1305\u1271", [F("\u12E8\u12F5\u122D\u1305\u1275 \u1235\u121D", "text", { required: true }), F("\u12D8\u122D\u134D", "text"), F("\u1218\u1320\u1295", "choice", { options: ["1\u201310", "11\u201350", "51\u2013200", "200+"] }), F("\u12E8\u1270\u124B\u124B\u1218\u1260\u1275 \u12D3\u1218\u1275", "number"), F("\u1235\u1208 \u12F5\u122D\u1305\u1273\u127D\u1295", "long"), F("\u134E\u1276\u12CE\u127D", "image")]),
    S("\u{1F4BC}", "\u12E8\u1225\u122B \u12D5\u12F5\u120E\u127D", [F("\u12A0\u1201\u1295 \u12E8\u121A\u1348\u1208\u1309 \u1219\u12EB\u12CE\u127D", "long"), F("\u12E8\u121A\u1348\u1208\u1309 \u1230\u12CE\u127D \u1265\u12DB\u1275", "number"), F("\u12E8\u1225\u122B \u12D3\u12ED\u1290\u1275", "multi", { options: ["\u1219\u1209 \u130A\u12DC", "\u1275\u122D\u134D \u130A\u12DC", "\u12AE\u1295\u1275\u122B\u1275", "\u130A\u12DC\u12EB\u12CA", "\u120D\u121D\u121D\u12F5"] }), F("\u12E8\u12F0\u1218\u12C8\u12DD \u12AD\u120D\u120D", "text"), F("\u121B\u1218\u120D\u12A8\u127B \u12E8\u121A\u12EB\u120D\u1245\u1260\u1275 \u1240\u1295", "date"), F("\u1325\u1245\u121B \u1325\u1245\u121E\u127D", "long")]),
    ADDRESS(),
    PAYMENT(),
    CONTACT(),
    ID_PRIV()
  ] },
  { key: "shop", icon: "\u{1F3EA}", kind: "\u1231\u1245", name: "\u1231\u1245 / \u1290\u130B\u12F4", tagline: "\u12D5\u1243\u12CE\u127D\u12CE\u1295 \u12EB\u1233\u12E9", build: () => [
    S("\u{1F3EA}", "\u1235\u1208 \u1231\u1241", [F("\u12E8\u1231\u1245 \u1235\u121D", "text", { required: true }), F("\u12E8\u121D\u1295\u1238\u1323\u1278\u12CD \u12D5\u1243\u12CE\u127D \u12D3\u12ED\u1290\u1275", "multi", { options: ["\u121D\u130D\u1265 \u12A5\u1293 \u1218\u1320\u1325", "\u120D\u1265\u1235 \u12A5\u1293 \u132B\u121B", "\u12A4\u120C\u12AD\u1275\u122E\u1292\u12AD\u1235", "\u121E\u1263\u12ED\u120D", "\u12E8\u1264\u1275 \u12D5\u1243", "\u130D\u1295\u1263\u1273", "\u130D\u1265\u122D\u1293", "\u12CD\u1260\u1275", "\u1218\u133B\u1215\u134D\u1275"] }), F("\u1235\u1208 \u1231\u1243\u127D\u1295", "long"), F("\u12E8\u1270\u1218\u1220\u1228\u1270\u1260\u1275 \u12D3\u1218\u1275", "number"), F("\u12E8\u12D5\u1243 \u134E\u1276\u12CE\u127D", "image")]),
    S("\u{1F6CD}\uFE0F", "\u12CB\u130B \u12A5\u1293 \u12A0\u1308\u120D\u130D\u120E\u1275", [F("\u12CB\u1293 \u12CB\u1293 \u12D5\u1243\u12CE\u127D \u12A5\u1293 \u12CB\u130B", "long"), F("\u121B\u12F5\u1228\u1235 \u12A0\u1208", "yesno"), F("\u12E8\u121B\u12F5\u1228\u123B \u12AD\u134D\u12EB (\u1265\u122D)", "number"), F("\u12E8\u121A\u12F0\u122D\u1235\u1263\u1278\u12CD \u12A0\u12AB\u1263\u1262\u12CE\u127D", "text"), F("\u1245\u1293\u123D / \u121B\u1235\u1273\u12C8\u1242\u12EB", "long")]),
    ADDRESS(),
    PAYMENT(),
    CONTACT(),
    ID_PRIV()
  ] },
  { key: "hotel", icon: "\u{1F3E8}", kind: "\u1206\u1274\u120D", name: "\u1206\u1274\u120D / \u121B\u1228\u134A\u12EB", tagline: "\u12A5\u1295\u130D\u12F6\u127D\u1295 \u12ED\u1240\u1260\u1209", build: () => [
    S("\u{1F3E8}", "\u1235\u1208 \u1206\u1274\u1209", [F("\u12E8\u1206\u1274\u120D \u1235\u121D", "text", { required: true }), F("\u12F0\u1228\u1303", "choice", { options: ["1 \u12AE\u12A8\u1265", "2 \u12AE\u12A8\u1265", "3 \u12AE\u12A8\u1265", "4 \u12AE\u12A8\u1265", "5 \u12AE\u12A8\u1265", "\u12F0\u1228\u1303 \u12E8\u1208\u12CD\u121D"] }), F("\u1235\u1208 \u1206\u1274\u120B\u127D\u1295", "long"), F("\u134E\u1276\u12CE\u127D", "image")]),
    S("\u{1F6CF}\uFE0F", "\u12AD\u134D\u120E\u127D \u12A5\u1293 \u12CB\u130B", [F("\u12E8\u12AD\u134D\u120D \u12D3\u12ED\u1290\u1276\u127D", "multi", { options: ["\u1290\u1320\u120B", "\u12F5\u122D\u1265", "\u1264\u1270\u1230\u1265", "\u1235\u12CA\u1275", "\u12F6\u122D\u121D"] }), F("\u12E8\u12AD\u134D\u120D \u1265\u12DB\u1275", "number"), F("\u12DD\u1245\u1270\u129B \u12CB\u130B \u1260\u12A0\u1295\u12F5 \u120C\u120A\u1275 (\u1265\u122D)", "number"), F("\u12A0\u1308\u120D\u130D\u120E\u1276\u127D", "multi", { options: ["\u1241\u122D\u1235", "\u12CB\u12ED\u134B\u12ED", "\u1353\u122D\u12AA\u1295\u130D", "\u121D\u130D\u1265 \u1264\u1275", "\u1263\u122D", "\u1302\u121D", "\u1235\u1265\u1230\u1263 \u12A0\u12F3\u122B\u123D", "\u121B\u1313\u1313\u12E3"] }), F("\u12E8\u1218\u130D\u1262\u12EB \u1230\u12D3\u1275", "text"), F("\u12E8\u1218\u12CD\u132B \u1230\u12D3\u1275", "text")]),
    ADDRESS(),
    PAYMENT(),
    CONTACT(),
    ID_PRIV()
  ] },
  { key: "service", icon: "\u{1F9F0}", kind: "\u12A0\u1308\u120D\u130D\u120E\u1275 \u1230\u132A", name: "\u12A0\u1308\u120D\u130D\u120E\u1275 (\u12AD\u120A\u1292\u12AD\u1363 \u1275\u121D\u1205\u122D\u1275 \u1264\u1275\u1363 \u1275\u122B\u1295\u1235\u1356\u122D\u1275\u2026)", tagline: "\u12A0\u1308\u120D\u130D\u120E\u1275\u12CE\u1295 \u12EB\u1235\u1270\u12CB\u12CD\u1241", build: () => [
    S("\u{1F9F0}", "\u1235\u1208 \u12A0\u1308\u120D\u130D\u120E\u1271", [F("\u12E8\u12A0\u1308\u120D\u130D\u120E\u1275 \u1235\u121D", "text", { required: true }), F("\u12D3\u12ED\u1290\u1275", "text"), F("\u12DD\u122D\u12DD\u122D \u1218\u130D\u1208\u132B", "long"), F("\u134E\u1276\u12CE\u127D", "image")]),
    S("\u{1F4B0}", "\u12CB\u130B \u12A5\u1293 \u1201\u1294\u1273", [F("\u1218\u1290\u123B \u12CB\u130B (\u1265\u122D)", "number"), F("\u12E8\u12CB\u130B \u12DD\u122D\u12DD\u122D", "long"), F("\u1240\u1320\u122E \u12EB\u1235\u1348\u120D\u130B\u120D", "yesno")]),
    ADDRESS(),
    PAYMENT(),
    CONTACT(),
    ID_PRIV()
  ] },
  { key: "blank", icon: "\u2728", kind: "\u120C\u120B", name: "\u1263\u12F6 \u2014 \u122B\u1234 \u12A5\u1240\u122D\u133B\u1208\u1201", tagline: "", build: () => [S("\u{1F64B}", "\u1235\u1208 \u12A5\u1294", [F("\u1235\u121D", "text", { required: true }), F("\u1218\u130D\u1208\u132B", "long")]), CONTACT()] }
];
const blankField = () => F("\u12A0\u12F2\u1235 \u1325\u12EB\u1244", "text");
const blankSection = () => S("\u{1F4CC}", "\u12A0\u12F2\u1235 \u12AD\u134D\u120D", [F("\u12A0\u12F2\u1235 \u1325\u12EB\u1244", "text")]);
const blankFormField = () => ({ id: id(), label: "\u12A0\u12F2\u1235 \u1325\u12EB\u1244", type: "text", hint: "", required: false, options: [] });
const VISITOR_PRESETS = [
  { name: "\u{1F4C5} \u1240\u1320\u122E / \u12AD\u134D\u120D \u121B\u1235\u12EB\u12E3", title: "\u1240\u1320\u122E \u12ED\u12EB\u12D9", button: "\u120B\u12AD", fields: () => [{ ...blankFormField(), label: "\u1219\u1209 \u1235\u121D", required: true }, { ...blankFormField(), label: "\u1235\u120D\u12AD", type: "phone", required: true }, { ...blankFormField(), label: "\u12E8\u121A\u1348\u120D\u1309\u1275 \u1240\u1295", type: "date" }, { ...blankFormField(), label: "\u121D\u1295 \u12D3\u12ED\u1290\u1275 \u12A0\u1308\u120D\u130D\u120E\u1275?", type: "long" }] },
  { name: "\u{1F4BC} \u121B\u1218\u120D\u12A8\u127B", title: "\u12EB\u1218\u120D\u12AD\u1271", button: "\u12A0\u1218\u120D\u12AD\u1275", fields: () => [{ ...blankFormField(), label: "\u1219\u1209 \u1235\u121D", required: true }, { ...blankFormField(), label: "\u1235\u120D\u12AD", type: "phone", required: true }, { ...blankFormField(), label: "\u120D\u121D\u12F5 (\u12D3\u1218\u1275)", type: "number" }, { ...blankFormField(), label: "\u1235\u1208 \u122B\u1235\u12CE", type: "long" }] },
  { name: "\u2753 \u1325\u12EB\u1244 / \u1275\u12D5\u12DB\u12DD", title: "\u1325\u12EB\u1244\u12CE\u1295 \u12ED\u120B\u12A9", button: "\u120B\u12AD", fields: () => [{ ...blankFormField(), label: "\u1235\u121D", required: true }, { ...blankFormField(), label: "\u1235\u120D\u12AD", type: "phone" }, { ...blankFormField(), label: "\u1218\u120D\u12D5\u12AD\u1275", type: "long", required: true }] }
];
