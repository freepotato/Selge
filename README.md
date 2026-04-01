# Selge

[![Typing SVG](https://readme-typing-svg.herokuapp.com?font=Fira+Code&duration=2000&pause=500&color=66AA0E&width=500&lines=Break+the+cycle.;Focus+on+life.;Forge+yourself.)](https://git.io/typing-svg)

![HTML5](https://img.shields.io/badge/-HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/-CSS3-1572B6?logo=css3)
![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Cloudflare](https://img.shields.io/badge/-Cloudflare-F38020?logo=cloudflare)

[中文](README_zh.md) [ENGLISH](README.md)

## 前言
有一天我像往常一样闲来无事打开游戏，玩了一会儿之后突然觉得内心无比空虚。我想，我不能再这样了。

我搜索了大量的资料，发现这可以归纳为一种简单而确定的模式：我们花费很少的精力，就能获取很大的满足，它是一个安全而且确定的奖励机制。但是这个奖励机制只能让我们沉迷于对我们的人生并无裨益的事情中，所以，我开始尝试创建一套属于我的人生的奖励机制。

通过跟AI反复辩论，我明白了我要做的东西：一个Life RPG模拟器。幸运的是，网上已经有类似的产品，可惜不幸的是，它们要么没有我想要的功能，要么收费极贵（Youtube上几十万播放的一个notion life rpg模板，基础版就要收费69美刀）。于是，Selge应运而生：一个基于Cloudflare Pages搭建的开源Life RPG模拟器。

过去无数个瞬间我都在想，假如我的人生是个游戏就好了，我猜你也这么想过。现在，不再想象，让我们付诸实践吧——路，就在脚下。

## 为什么叫“Selge”？
我搜过很多关键词，比如 “人生 RPG”“打造人生” 之类的，但全都被占用了。我想要一个独一无二的名字，于是把 self（自我）和 forge（锻造）拼在一起，造了这个词。

## 如何使用？
我已经把它部署在 Cloudflare Pages 上了，应该是纯静态、速度很快的。直接访问[这里](http://selge.pages.dev)即可。

## 如何贡献？
老实说，我也不知道。目前的话，你觉得有什么问题就先加issue吧。

## 0.X.Y版本MINOR更新日志

0.1.0: 设计初始UI，构建基础功能如历险、随笔、设置等，部署在cloudflare上，同时适配移动端。
0.2.0: 网站重构，从单一html文件专为vue+vite的网站。
0.3.0: 添加本地数据导入导出功能，构建清晰的数据存储结构。
0.4.0: 实现文本类数据云端同步，存储在cloudflare的kv中。
0.5.0: 添加仓库功能，图片存储在cloudlfare的r2中，调整了多项细节，提升网站使用舒适度。
0.6.0: 将网站架构模块化，提高可维护性，引入Phosphor图标，完善登录和云端存储机制，引入release-please action。

## 免责声明
使用MIT许可证。请勿用于商业用途。