import './style.css'
import overlayToolkit from "overlay-toolkit";
import { LogCounter as LogCounter } from './item-counter';
import { Uploader } from './uploader';
import { Config, read_config, write_config } from './config';
import { repo } from './data_repo';
import { PacketBasedCounter } from './packet-counter';
import { ExplorationResult, Item } from './types';

var cfg: Config = read_config();
var totalRevenue = 0;
var usePacketBasedCounter = false; // 是否使用基于数据包的解析方式

const uploader = new Uploader(cfg.webhook, cfg.token);
const logCounter = new LogCounter(logCounterHandler); // 传统的日志解析方式
const packetCounter = new PacketBasedCounter(packetCounterHandler); // 基于数据包的解析方式

/**
 * 日志解析回调
 * @param name 
 * @param items 
 * @returns 
 */
function logCounterHandler(name: string, items: Item[]) {
  if (items.length === 0 || usePacketBasedCounter)
    return;

  addShipResult(name, items);
  if (cfg.webhook && cfg.token) {
    uploader.setUrlToken(cfg.webhook, cfg.token);
    showPromiseError(output, uploader.kdocsUploadV1(name, items));
  }
}

/**
 * 数据包解析回调
 * @param data 
 * @returns 
 */
function packetCounterHandler(data: ExplorationResult) {
  if (data.items.length === 0)
    return;

  addShipResult(data.name, data.items);
  if (cfg.webhook && cfg.token) {
    uploader.setUrlToken(cfg.webhook, cfg.token);
    if (cfg.revision === 1) {
      showPromiseError(output, uploader.kdocsUploadV1(data.name, data.items));
    } else {
      showPromiseError(output, uploader.kdocsUploadV2(data));
    }
  }
  if (cfg.consent_analysis) {
    uploader.analysisUploadV2(data).catch((err) => {
      console.error("上传分析数据失败:", err);
    });
  }
}

/**
 * 显示潜艇探索结果
 * @param name 
 * @param items 
 */
function addShipResult(name: string, items: Item[]) {
  var shipNode = document.createElement("div");
  listNode.appendChild(shipNode);

  var totalVal = 0;
  items.forEach(item => {
    var info = repo.getItemInfo(item.id);
    if (info === undefined)
      return;

    var itemNode = document.createElement("div");
    itemNode.innerText = info.Name + " ×" + item.amount;
    listNode.appendChild(itemNode);

    totalVal += info.PriceLow * item.amount;
  });

  shipNode.innerText = name + ": " + totalVal.toString();

  totalRevenue += totalVal;
  totalNode.innerText = totalRevenue.toString();
  rootNode.classList.remove("hide");
}

document.getElementById("close")!.onclick = (evt) => {
  rootNode.classList.add("hide");
  listNode.innerText = "";
  totalRevenue = 0;
  evt.preventDefault();
};

var listNode = document.getElementById("item-list")!;
var totalNode = document.getElementById("total-value")!;
var rootNode = document.getElementById("app")!;
var cfgNode = document.getElementById("config")!;
var output = document.getElementById("output")!;

var cfgWebhook = document.getElementById("webhook")! as HTMLInputElement;
var cfgToken = document.getElementById("token")! as HTMLInputElement;
var testOutput = document.getElementById("test-output")!;
var cfgConsent = document.getElementById("consent_analysis")! as HTMLInputElement;
var cfgRevision1 = document.getElementById("revision-1")! as HTMLInputElement;
var cfgRevision2 = document.getElementById("revision-2")! as HTMLInputElement;

document.getElementById("test-cfg")!.onclick = (_) => {
  const uploader = new Uploader(cfgWebhook.value, cfgToken.value);

  if (cfgRevision1.checked) {
    const promise = uploader.kdocsUploadV1("测试用数据", [
      { id: 22500, hq: false, amount: 1 },
      { id: 22501, hq: false, amount: 2 },
      { id: 22502, hq: false, amount: 3 },
    ]);
    showPromiseError(testOutput, promise);
  }
  else if (cfgRevision2.checked) {
    const promise = uploader.kdocsUploadV2({
      name: "测试用数据",
      returnTime: Math.floor(Date.now() / 1000),
      registerTime: Math.floor(Date.now() / 1000) - 3600,
      rating: 1,
      dests: [1, 2, 3],
      parts: [1, 2, 3, 4],
      rank: 1,
      items: [{
        id: 22500, amount: 1, hq: false,
        surveillance: 0, retrieval: 0, discoveryDesc: 0,
        doubleDip: false, isSecondDip: false, fromTier3Pool: false,
        destId: 1, rating: 1,
      }, {
        id: 22501, amount: 2, hq: false,
        surveillance: 1, retrieval: 1, discoveryDesc: 1,
        doubleDip: true, isSecondDip: false, fromTier3Pool: true,
        destId: 2, rating: 2,
      }],
    });
    showPromiseError(testOutput, promise);
  }
};

function showPromiseError<T>(elem: HTMLElement, promise: Promise<T>) {
  promise.then((_) => {
    elem.className = "success";
    elem.innerText = "上传成功";
  }).catch((err) => {
    console.log(err);
    elem.className = "fail";
    elem.innerText = err.toString();
  });
}

document.getElementById("apply-cfg")!.onclick = (_) => {
  write_config({
    webhook: cfgWebhook.value,
    token: cfgToken.value,
    revision: cfgRevision1.checked ? 1 : 2,
    consent_analysis: cfgConsent.checked,
  });
  cfg = read_config();
  cfgNode.classList.add("hide");
};

document.getElementById("setting")!.onclick = (_) => {
  cfgNode.classList.toggle("hide");
  cfgWebhook.value = cfg.webhook;
  cfgToken.value = cfg.token;
  cfgConsent.checked = cfg.consent_analysis === true;
  cfgRevision1.checked = cfg.revision === 1;
  cfgRevision2.checked = cfg.revision === 2;
  testOutput.innerText = "";
};

logCounter.init(overlayToolkit);
packetCounter.init(overlayToolkit).then(() => {
  console.log("PacketBasedCounter initialized");
  usePacketBasedCounter = true;
});

overlayToolkit.Start();
