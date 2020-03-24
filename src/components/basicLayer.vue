<template>
  <div id="map">
    <div id="baseMap"></div>
    <el-button-group id="buttonGroup">
      <el-button
        type="primary"
        icon="el-icon-sort"
        @click="switchLayer"
      ></el-button>
      <el-button type="primary" icon="el-icon-share"></el-button>
      <el-button type="primary" icon="el-icon-delete"></el-button>
    </el-button-group>
  </div>
</template>
<script>
import "ol/ol.css";
import { Map, View } from "ol";
import tileSource from "ol/source/XYZ";
import tileLayer from "ol/layer/Tile";
export default {
  name: "basicLayer",
  data() {
    return {
      map: null,
      googleMap: null,
      aMap: null
    };
  },
  mounted() {
    this.googleMap = new tileLayer({
      source: new tileSource({
        url:
          "http://mt2.google.cn/vt/lyrs=y&hl=zh-CN&gl=CN&src=app&x={x}&y={y}&z={z}&s=G"
      }),
      projection: "EPSG:3857"
    });
    this.aMap = new tileLayer({
      source: new tileSource({
        url:
          "http://webrd03.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8"
      }),
      projection: "EPSG:3857"
    });
    this.googleMap.setVisible(false);
    let view = new View({
      center: [104.0, 36.0],
      zoom: 7,
      maxZoom: 15,
      minZoom: 1,
      projection: "EPSG:3857"
    });
    this.map = new Map({
      target: "baseMap",
      view: view,
      layers: [this.googleMap, this.aMap]
    });
  },
  methods: {
    switchLayer: function() {
      let flag = this.googleMap.getVisible();
      this.googleMap.setVisible(!flag);
      this.aMap.setVisible(flag);
    }
  }
};
</script>
<style lang="less" scoped>
#buttonGroup{
  position: fixed;
  top: 5%;
  right: 2%;
}
</style>
