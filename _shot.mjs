import { chromium } from "playwright";import { pathToFileURL } from "node:url";
const b=await chromium.launch();const p=await b.newPage({deviceScaleFactor:2,viewport:{width:720,height:520}});
await p.goto(pathToFileURL("_preview.html").href);await p.waitForTimeout(400);await p.screenshot({path:"_preview.png",fullPage:true});await b.close();console.log("ok");
