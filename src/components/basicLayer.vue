<template>
  <div id="map">
    <div id="baseMap"></div>
    <el-button-group id="buttonGroup">
      <el-button
        type="primary"
        icon="iconfont measuringqiehuanditumoshi"
        @click="switchLayer"
        title="地图切换"
      ></el-button>
      <el-button
        type="primary"
        icon="iconfont measuringchangduceliang"
        title="距离测量"
        @click="getGeomLengthOrArea('LineString')"
      ></el-button>
      <el-button
        type="primary"
        icon="iconfont measuringmianjiceliang"
        title="面积测量"
        @click="getGeomLengthOrArea('Polygon')"
      ></el-button>
    </el-button-group>
  </div>
</template>
<script>
import "ol/ol.css";
import { Map, View } from "ol";
import { XYZ as tileSource, Vector as vectorSource } from "ol/source";
import { Tile as tileLayer, Vector as vectorLayer } from "ol/layer";
import Overlay from "ol/Overlay";
import { stroke, Fill, style, Circle, Style, Stroke } from "ol/style";
import { unByKey } from "ol/Observable";
import { getLength, getArea } from "ol/sphere";
import { LineString, Polygon } from "ol/geom";
import Draw from "ol/interaction/Draw";

export default {
  name: "basicLayer",
  data() {
    return {
      map: null,
      googleMap: null,
      aMap: null,
      vectorSou: null,
      vectorLay: null,
      draw: null
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
    },
    createVector: function() {
      this.vectorSou = new vectorSource();
      this.vectorLay = new vectorLayer({
        source: this.vectorSou,
        style: new Style({
          fill: new Fill({
            color: "rgba(255,255,255,0.2)"
          }),
          stroke: new Stroke({
            color: "#ffcc33",
            width: 2
          }),
          image: new Circle({
            redius: 5,
            color: "#ffcc33"
          })
        })
      });
      this.map.addLayers([this.vectorLay]);
    },
    getGeomLengthOrArea: function(geomType) {
      if (this.vectorLay == null) {
        this.createVector();
      }
    },
    addInteraction: function(geomType) {
      let type = geomType == "Polygon" ? "polygon" : "LineString";
      this.draw = new Draw({
        source: this.vectorSou,
        type: type,
        style: new Style({
          fill: new Fill({
            color: 'rgba(255,255,255,0.2)'
          }),
          stroke: new Stroke({
            color: 'rgba(0,0,0,0.5)',
            lineDash: [10,10],
            width:2
          }),
          image: new Circle({
            radius: 5,
            stroke: new Stroke({
              color: 'rgba(0,0,0,0.7)'
            }),
            fill: new Fill({
              color: 'rgba(255,255,255,0.2)'
            })
          })
        })
      })
    }
  }
};
</script>
<style lang="less" scoped>
#buttonGroup {
  position: fixed;
  top: 2%;
  right: 2%;
}
</style>
