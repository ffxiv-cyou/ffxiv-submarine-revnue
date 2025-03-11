import './style.css'
import './ngld/common.js'
import { ItemCounter, ItemInfo } from './item-counter';
import ItemData from "./data.json";

var itemMap = new Map<number, ItemInfo>();
ItemData.forEach(item => {
  itemMap.set(item.Id, item);
});

var listNode = document.getElementById("item-list")!;
var totalNode = document.getElementById("total-value")!;
var rootNode = document.getElementById("app")!;

var totalRevenue = 0;

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
});

document.getElementById("close")!.onclick = (evt) => {
  rootNode.classList.add("hide");
  listNode.innerText = "";
  totalRevenue = 0;
  evt.preventDefault();
};

addOverlayListener("LogLine", (msg) => {
  counter.parseLogLines(msg.line);
});

startOverlayEvents();
