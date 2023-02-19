import './style.css'
import './ngld/common.js'
import { ItemCounter, ItemInfo } from './item-counter';
import ItemData from "./data.json";

var itemMap = new Map<number, ItemInfo>();
ItemData.forEach(item => {
  itemMap.set(item.Id, item);
});

var shipNode = document.getElementById("ship-name")!;
var listNode = document.getElementById("item-list")!;
var totalNode = document.getElementById("total-value")!;
var rootNode = document.getElementById("app")!;

var counter = new ItemCounter((name, items) => {
  shipNode.innerText = name;
  listNode.innerHTML = "";

  var totalVal = 0;
  items.forEach(item => {
    var info = itemMap.get(item.id);
    if (info === undefined)
      return;

    var root = document.createElement("div");
    root.innerText = info.Name + " ×" + item.amount;
    listNode.appendChild(root);

    totalVal += (item.hq ? info.PriceMid : info.PriceLow) * item.amount;
  });

  totalNode.innerText = totalVal.toString();
  rootNode.classList.remove("hide");
});

document.getElementById("close")!.onclick = (evt) => {
  rootNode.classList.add("hide");
  evt.preventDefault();
};

totalNode.onclick = () => {
  navigator.clipboard.writeText(totalNode.innerText);
}

addOverlayListener("LogLine", (msg) => {
  counter.parseLogLines(msg.line);
});

startOverlayEvents();
