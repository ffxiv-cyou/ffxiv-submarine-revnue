import './style.css'
import overlayToolkit from "overlay-toolkit";
import { Item, ItemCounter, ItemInfo } from './item-counter';
import ItemData from "./data.json";
import { kdocs_webhook } from './kdocs';
import { Config, read_config, write_config } from './config';

var itemMap = new Map<number, ItemInfo>();
ItemData.forEach(item => {
  itemMap.set(item.Id, item);
});

var listNode = document.getElementById("item-list")!;
var totalNode = document.getElementById("total-value")!;
var rootNode = document.getElementById("app")!;
var cfgNode = document.getElementById("config")!;
var output = document.getElementById("output")!;

var totalRevenue = 0;

var cfg: Config = read_config();

var counter = new ItemCounter((name, items) => {
  if (items.length === 0)
    return;

  var shipNode = document.createElement("div");
  listNode.appendChild(shipNode);

  var totalVal = 0;
  items.forEach(item => {
    var info = itemMap.get(item.id);
    if (info === undefined)
      return;

    var itemNode = document.createElement("div");
    itemNode.innerText = info.Name + " ×" + item.amount;
    listNode.appendChild(itemNode);

    totalVal += (item.hq ? info.PriceMid : info.PriceLow) * item.amount;
  });

  shipNode.innerText = name + ": " + totalVal.toString();

  totalRevenue += totalVal;
  totalNode.innerText = totalRevenue.toString();
  rootNode.classList.remove("hide");

  if (cfg.webhook && cfg.token) {
    sendResult(cfg.webhook, cfg.token, name, items)
      .then((_) => {output.className = "success"; output.innerText = "上传成功";})
      .catch((err) => {output.className = "fail"; output.innerText = err.toString();});
  }
});

document.getElementById("close")!.onclick = (evt) => {
  rootNode.classList.add("hide");
  listNode.innerText = "";
  totalRevenue = 0;
  evt.preventDefault();
};

overlayToolkit.AddListener("LogLine", (msg) => {
  counter.parseLogLines(msg.line);
});

var cfgWebhook = document.getElementById("webhook")! as HTMLInputElement;
var cfgToken = document.getElementById("token")! as HTMLInputElement;
var testOutput = document.getElementById("test-output")!;

async function sendResult(webhook: string, token: string, ship: string, items: Item[]) {
  let response = await kdocs_webhook(webhook, token, {
    data: items.map(item => {
      var info = itemMap.get(item.id);
      if (info == undefined)
        return undefined;
      var price = (item.hq ? info.PriceMid : info.PriceLow);
      return {
        fields: {
          '潜艇名': ship,
          '物品名': info.Name,
          '数量': item.amount,
          '单价': price,
          '总价': price! * item.amount,
        }
      };
    }).filter(item => item !== undefined),
  });

  var body = response.body as unknown as string;
  var obj = JSON.parse(body);
  if (response.ok) {
    return obj;
  }

  throw new Error(obj.error || obj.msg || obj.reason || obj.result || body);
}

document.getElementById("test-cfg")!.onclick = (_) => {
  sendResult(cfgWebhook.value, cfgToken.value, "测试用数据", [
    new Item(22500, false, 1),
    new Item(22501, false, 2),
    new Item(22502, false, 3),
  ]).then((res) => {
    console.log(res);
    testOutput.className = "success";
    testOutput.innerText = "上传成功";
  }).catch((err) => {
    testOutput.innerText = err.toString();
    testOutput.className = "fail";
  });
};

document.getElementById("apply-cfg")!.onclick = (_) => {
  write_config(cfgWebhook.value, cfgToken.value);
  cfg = read_config();
  cfgNode.classList.add("hide");
};

document.getElementById("setting")!.onclick = (_) => {
  cfgNode.classList.toggle("hide");
  cfgWebhook.value = cfg.webhook;
  cfgToken.value = cfg.token;
  testOutput.innerText = "";
};

overlayToolkit.Start();
