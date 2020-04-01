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
    <el-table :data="tableData" class="featureTable" v-show="flag">
      <el-table-column prop="name" label="名称" width="150"> </el-table-column>
      <el-table-column label="操作" width="130">
        <template slot-scope="scope">
          <el-button
            @click.native.prevent="zoomToFeature(scope.row)"
            type="text"
            size="small"
          >
            移动至
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-input class="queryGroup" placeholder="请输入内容" v-model="featureName">
      <el-button
        type="primary"
        slot="append"
        icon="el-icon-search"
        @click="queryFeature"
      ></el-button>
    </el-input>
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
import {
  XYZ as tileSource,
  Vector as vectorSource,
  TileWMS as tileWMS
} from "ol/source";
import { Tile as tileLayer, Vector as vectorLayer } from "ol/layer";
import GeoJSON from "ol/format/GeoJSON";
import Overlay from "ol/Overlay";
import {
  stroke,
  Fill,
  style,
  Circle,
  Style,
  Stroke,
  Icon,
  Text
} from "ol/style";
import { unByKey } from "ol/Observable";
import { getLength, getArea } from "ol/sphere";
import { LineString, Polygon, Point } from "ol/geom";
import Feature from "ol/Feature";
import Draw from "ol/interaction/Draw";
import axios from "axios";

export default {
  name: "basicLayer",
  data() {
    return {
      map: null,
      googleMap: null, //谷歌影像图
      aMap: null, //高德在线矢量图
      vectorSou: null, //测量画图矢量源
      vectorLay: null, //测量画图图层
      draw: null, //测量画图工具
      geomType: null, //绘画类型
      sketch: null,
      listener: null, //监听移动事件，方便后面取消监听
      measureTooltip: null, //覆盖层
      measureMoveTooltip: null, //移动时的覆盖层element
      measureTooltipElement: [], //绘画结束时的覆盖层element组
      featureName: null, //需要查询的地点名称
      daoguanSource: null, //自己发布的wms服务
      resultSource: null, //查询到的结果
      resultLayer: null, //查询到的结果图层
      resultStyle: null, //结果要素的样式
      src: null, //图片地址
      tableData: [], //查询到的结果的名称
      flag: false
    };
  },
  mounted() {
    this.src = require("@/assets/point.png");
    this.googleMap = new tileLayer({
      source: new tileSource({
        url:
          "http://mt2.google.cn/vt/lyrs=y&hl=zh-CN&gl=CN&src=app&x={x}&y={y}&z={z}&s=G"
      }),
      projection: "EPSG:4326"
    });
    this.aMap = new tileLayer({
      source: new tileSource({
        url:
          "http://webrd03.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8"
      }),
      projection: "EPSG:4326"
    });
    this.googleMap.setVisible(false);
    // 加载wms地图
    this.daoguanSource = new tileWMS({
      url: "http://localhost:8519/geoserver/dao/wms",
      params: {
        LAYERS: "dao:postgisdaoguan",
        TILED: true
      },
      serverType: "geoserver",
      projection: "EPSG:4326"
    });
    let daoguanLayer = new tileLayer({
      source: this.daoguanSource
    });
    this.resultSource = new vectorSource();
    this.resultLayer = new vectorLayer({
      source: this.resultSource
    });
    let view = new View({
      center: [113.77441, 33.70605],
      zoom: 8,
      maxZoom: 15,
      minZoom: 1,
      projection: "EPSG:4326"
    });
    this.map = new Map({
      target: "baseMap",
      view: view,
      layers: [this.googleMap, this.aMap, daoguanLayer, this.resultLayer]
    });
    this.map.on("singleclick", evt => {
      let viewResolution = view.getResolution();
      let url = this.daoguanSource.getFeatureInfoUrl(
        evt.coordinate,
        viewResolution,
        "EPSG:4326",
        { INFO_FORMAT: "application/json" }
      );
      if (url) {
        axios.get(url).then(response => {
          console.log(response.data);
        });
      }
    });
  },
  methods: {
    //地图切换
    switchLayer: function() {
      let flag = this.googleMap.getVisible();
      this.googleMap.setVisible(!flag);
      this.aMap.setVisible(flag);
    },
    //创建矢量化图层
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
    // 获取长度或面积
    getGeomLengthOrArea: function(geomType) {
      if (this.vectorLay == null) {
        this.createVector();
      }
      if (this.geomType && this.geomType == geomType) {
        if (this.draw) {
          this.map.getInteractions().array_.length = 9;
          this.draw = null;
          this.geomType = null;
        }
      } else {
        this.geomType = geomType;
        this.createMeasureTooltip();
        this.addInteraction(geomType);
        this.map.addInteraction(this.draw);
      }
    },
    // 将测量工具添加到map中
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
      // 开始绘画事件
      this.draw.on("drawstart", ev => {
        this.sketch = ev.feature;
        coordinate = ev.coordinate;
        // 实时监测
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
      // 绘画结束
      this.draw.on("drawend", ev => {
        this.sketch = null;
        this.measureTooltipElement.push({ value: output });
        let index = this.getArrayIndex(this.measureTooltipElement, {
          value: output
        });
        let divId = "step" + index;
        let element;
        // 当div的id动态加载好之后设置覆盖层以及要素的id方便后面进行删除
        this.$nextTick(() => {
          element = document.getElementById(divId);
          this.measureTooltip.setElement(element);
          this.measureTooltip.id = divId;
          this.measureTooltip.setPosition(coordinate);
          ev.feature.setId(divId);
        });
        this.map.removeInteraction(this.draw);
        this.draw = null;
        unByKey(this.listener);
      });
    },
    // 计算长度并且转换单位
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
    // 计算面积并且换算单位
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
    // 创建覆盖层显示长度或面积
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
    // 删除覆盖层以及当前feature
    deleteMeasure: function(index) {
      let featureId = this.step(index);
      let feature = this.vectorSou.getFeatureById(featureId);
      this.vectorSou.removeFeature(feature);
      let node = document.getElementById(featureId);
      node.parentNode.removeChild(node);
      let overlay = this.map.getOverlayById(featureId);
      this.map.removeOverlay(overlay);
      this.measureTooltipElement[index] = "";
    },
    // 进行图层属性查询
    queryFeature: function() {
      this.flag = false;
      this.tableData = [];
      if (this.featureName) {
        axios
          .get(
            "http://localhost:8519/geoserver/dao/ows?" +
              "service=WFS&request=GetFeature&typeName=dao:queryFeature" +
              "&outputFormat=application%2Fjson&viewparams=name:" +
              this.featureName
          )
          .then(value => {
            this.resultSource.clear();
            let point,
              pointArr = [];
            if (value.data.totalFeatures == 0) {
              this.$message.error("未查询到相关地点");
            } else {
              for (let feature of value.data.features) {
                point = new GeoJSON().readFeatures(feature);
                point[0].setStyle(
                  this.setFeatureStyle(feature.properties.name)
                );
                point[0].setId(feature.properties.name);
                this.tableData.push({
                  name: feature.properties.name,
                  feature: point[0]
                });
                this.flag = true;
                pointArr.push(point[0]);
              }
              this.resultSource.addFeatures(pointArr);
              this.map.getView().fit(this.resultSource.getExtent());
            }
          });
      } else {
        this.$message.error("请输入要查询的地点名称");
      }
    },
    zoomToFeature: function(row) {
      this.map.getView().fit(row.feature.getGeometry());
    },
    // 得到当前div的下标
    getArrayIndex: function(arr, obj) {
      var i = arr.length;
      while (i--) {
        if (arr[i].value == obj.value) {
          return i;
        }
      }
      return -1;
    },
    // 动态设置id
    step: function(i) {
      return "step" + i;
    },
    //设置feature样式
    setFeatureStyle: function(name) {
      return new Style({
        image: new Icon({
          scale: 0.1,
          anchor: [0.5, 1],
          src: this.src
        }),
        text: new Text({
          text: name,
          textAlign: "center",
          offsetY: -30,
          fill: new Fill({
            color: "yellow"
          }),
          backgroundFill: new Fill({
            color: "#750075"
          })
        })
      });
    }
  }
};
</script>
<style lang="less" scoped>
@top: 2%;
@position: fixed;
@leftOrRight: 2%;
#buttonGroup {
  position: @position;
  top: @top;
  right: @leftOrRight;
}
.queryGroup {
  position: @position;
  top: @top;
  left: @leftOrRight;
  width: 15%;
}
.featureTable {
  position: @position;
  top: 6%;
  left: @leftOrRight;
  width: 15%;
}
</style>
