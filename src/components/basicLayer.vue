<template>
  <div id="map">
    <div v-for="(item, index) in measureTooltipElement" :key="index">
      <div :id="step(index)" class="ol-tooltip ol-tooltip-static">
        {{ item.value }}
        <el-button
          type="primary"
          icon="el-icon-delete"
          @click="deleteMeasure(index)"
        ></el-button>
      </div>
    </div>
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
      googleMap: null,//谷歌影像图
      aMap: null,//高德在线矢量图
      vectorSou: null,//测量画图矢量源
      vectorLay: null,//测量画图图层
      draw: null,//测量画图工具
      sketch: null,
      listener: null,//监听移动事件，方便后面取消监听
      measureTooltip: null,//覆盖层
      measureMoveTooltip: null,//移动时的覆盖层element
      measureTooltipElement: []//绘画结束时的覆盖层element组
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
    //地图切换
    switchLayer: function() {
      let flag = this.googleMap.getVisible();
      this.googleMap.setVisible(!flag);
      this.aMap.setVisible(flag);
    },
    //创建
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
      this.map.addLayer(this.vectorLay);
    },
    getGeomLengthOrArea: function(geomType) {
      if (this.vectorLay == null) {
        this.createVector();
      }
      this.createMeasureTooltip();
      this.addInteraction(geomType);
      this.map.addInteraction(this.draw);
    },
    addInteraction: function(geomType) {
      let type = geomType == "Polygon" ? "Polygon" : "LineString";
      this.draw = new Draw({
        source: this.vectorSou,
        type: type,
        style: new Style({
          fill: new Fill({
            color: "rgba(255,255,255,0.2)"
          }),
          stroke: new Stroke({
            color: "rgba(0,0,0,0.5)",
            lineDash: [10, 10],
            width: 2
          }),
          image: new Circle({
            radius: 5,
            stroke: new Stroke({
              color: "rgba(0,0,0,0.7)"
            }),
            fill: new Fill({
              color: "rgba(255,255,255,0.2)"
            })
          })
        })
      });
      let output, coordinate;
      this.draw.on("drawstart", ev => {
        this.sketch = ev.feature;
        coordinate = ev.coordinate;
        this.listener = this.sketch.getGeometry().on("change", ev => {
          let geom = ev.target;
          if (geom instanceof Polygon) {
            output = this.formatArea(geom);
            coordinate = geom.getInteriorPoint().getCoordinates();
          } else if (geom instanceof LineString) {
            output = this.formatLength(geom);
            coordinate = geom.getLastCoordinate();
          }
          this.measureMoveTooltip.innerHTML = output;
          this.measureTooltip.setPosition(coordinate);
        });
      });
      this.draw.on("drawend", ev => {
        this.sketch = null;
        this.measureTooltipElement.push({ value: output });
        let index = this.getArrayIndex(this.measureTooltipElement, {
          value: output
        });
        let divId = "step" + index;
        let element;
        this.$nextTick(() => {
          element = document.getElementById(divId);
          this.measureTooltip.setElement(element);
          this.measureTooltip.id = divId;
          this.measureTooltip.setPosition(coordinate);
          ev.feature.setId(divId);
        });
        unByKey(this.listener);
        this.map.removeInteraction(this.draw);
      });
    },
    formatLength: function(line) {
      let length = getLength(line);
      let output;
      if (length > 100) {
        output = Math.round((length / 1000) * 100) / 100 + "km";
      } else {
        output = Math.round(length * 100) / 100 + "m";
      }
      return output;
    },
    formatArea: function(polygon) {
      let area = getArea(polygon);
      let output;
      if (area > 10000) {
        output = Math.round((area / 1000000) * 100) / 100 + "km²";
      } else {
        output = Math.round(area * 100) / 100 + "m²";
      }
      return output;
    },
    createMeasureTooltip: function() {
      if (this.measureMoveTooltip) {
        this.measureMoveTooltip = null;
      }
      this.measureMoveTooltip = document.createElement("div");
      this.measureMoveTooltip.className = "ol-tooltip ol-tooltip-measure";
      this.measureTooltip = new Overlay({
        element: this.measureMoveTooltip,
        offset: [0, -15],
        positioning: "bottom-center"
      });
      this.map.addOverlay(this.measureTooltip);
    },
    deleteMeasure: function(index) {
      let featureId = this.step(index);
      let feature = this.vectorSou.getFeatureById(featureId);
      this.vectorSou.removeFeature(feature);
      let node = document.getElementById(featureId);
      node.parentNode.removeChild(node);
      let overlay = this.map.getOverlayById(featureId);
      this.map.removeOverlay(overlay);
      this.measureTooltipElement[index] = null;
    },
    getArrayIndex: function(arr, obj) {
      var i = arr.length;
      while (i--) {
        if (arr[i].value == obj.value) {
          return i;
        }
      }
      return -1;
    },
    step: function(i) {
      return "step" + i;
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
