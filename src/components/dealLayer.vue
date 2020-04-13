<template>
  <div style="height: 100%;width:100%;">
    <div id="overlay">
      <el-form :inline="true" :model="formInline" class="demo-form-inline">
        <el-form-item>
          <el-input
            v-model="formInline.name"
            placeholder="请填写道观名称"
          ></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSubmit">确定</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div id="map"></div>
    <el-button-group id="buttonGroup">
      <el-button
        type="primary"
        :icon="addIcon"
        :title="addTitle"
        @click="addClick"
        :disabled="isCanUse"
      ></el-button>
      <el-button
        type="primary"
        :icon="editIcon"
        :title="editTitle"
        @click="editPoint"
        :disabled="isCanUse"
      ></el-button>
      <el-select v-model="value" placeholder="请选择">
        <el-option
          v-for="item in options"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        >
        </el-option>
      </el-select>
    </el-button-group>
  </div>
</template>
<script>
import { Map, View } from "ol";
import { WFS, GeoJSON } from "ol/format";
import Feature from "ol/Feature";
import { toLonLat } from "ol/proj";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import {
  XYZ as tileSource,
  Vector as vectorSource,
  TileWMS as tileWMS
} from "ol/source";
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
import Overlay from "ol/Overlay";
import { Draw, Modify, Snap } from "ol/interaction";
import { Point } from "ol/geom";
import axios from "axios";

export default {
  name: "dealLayer",
  data() {
    return {
      addTitle: "新增",
      addIcon: "el-icon-plus",
      editTitle: "编辑",
      editIcon: "el-icon-edit",
      options: [
        {
          value: "Point",
          label: "点"
        },
        {
          value: "LineString",
          label: "线"
        },
        {
          value: "Polygon",
          label: "面"
        }
      ],
      value: "",
      googleMap: null,
      map: null,
      wfsLayer: null,
      wfsSource: null,
      src: null,
      pointSource: null,
      pointLayer: null,
      draw: null,
      snap: null, //捕获工具
      modify: null,
      overlay: null,
      feature: null,
      isCanUse: false,
      formInline: {
        name: ""
      }
    };
  },
  mounted() {
    this.src = require("@/assets/point.png");
    this.googleMap = new TileLayer({
      source: new tileSource({
        url:
          "http://mt2.google.cn/vt/lyrs=y&hl=zh-CN&gl=CN&src=app&x={x}&y={y}&z={z}&s=G"
      }),
      projection: "EPSG:4326"
    });
    this.wfsSource = new vectorSource({
      url:
        "http://localhost:8519/geoserver/dao/wfs?" +
        "service=WFS&version=1.1.0&" +
        "request=GetFeature&typeName=dao:postgisdaoguan&" +
        "outputFormat=json&srsname=EPSG:4326",
      format: new GeoJSON({
        geometryName: "geom"
      })
    });
    this.wfsLayer = new VectorLayer({
      source: this.wfsSource,
      style: feature => {
        return this.createStyle(feature.values_.name);
      }
    });
    this.overlay = new Overlay({
      element: document.getElementById("overlay"),
      offset: [10, 0],
      positioning: "bottom-center"
    });
    this.pointSource = new vectorSource();
    this.pointLayer = new VectorLayer({
      source: this.pointSource
    });
    this.map = new Map({
      target: "map",
      view: new View({
        center: [113.77441, 33.70605],
        zoom: 8,
        maxZoom: 15,
        minZoom: 1,
        projection: "EPSG:4326"
      }),
      layers: [this.googleMap, this.wfsLayer, this.pointLayer]
    });
  },
  methods: {
    createStyle(name) {
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
    },
    addClick() {
      if (this.addTitle == "取消") {
        this.map.removeInteraction(this.snap);
        this.map.removeInteraction(this.draw);
        this.draw = null;
      } else {
        this.addInteraction(this.value);
        this.map.addInteraction(this.draw);
        this.map.addInteraction(this.snap);
      }
      this.addTitle = this.addTitle == "新增" ? "取消" : "新增";
      this.addIcon =
        this.addIcon == "el-icon-plus" ? "el-icon-minus" : "el-icon-plus";
    },
    addInteraction(geomType) {
      this.draw = new Draw({
        source: this.pointSource,
        type: geomType,
        stopClick: true
      });
      this.snap = new Snap({
        source: this.pointSource
      });
      this.draw.on("drawend", evt => {
        if (evt.feature != null) {
          this.isCanUse = true;
          this.map.removeInteraction(this.draw);
          this.overlay.setPosition(evt.feature.getGeometry().getCoordinates());
          this.map.addOverlay(this.overlay);
          let geometryCoordinates = evt.feature.getGeometry().getCoordinates();
          this.feature = new Feature({
            geom: new Point([geometryCoordinates[1], geometryCoordinates[0]])
          });
        }
      });
    },
    editPoint() {
      if (this.editTitle == "取消") {
        this.map.removeInteraction(this.modify);
      } else {
        this.addModify();
        this.map.addInteraction(this.modify);
      }
      this.editTitle = this.editTitle == "编辑" ? "取消" : "编辑";
      this.editIcon =
        this.editIcon == "el-icon-edit" ? "el-icon-minus" : "el-icon-edit";
    },
    addModify() {
      this.modify = new Modify({
        source: this.wfsSource
      });
    },
    onSubmit() {
      if (!this.formInline.name) {
        this.$message.error("请输入道观名称");
        return;
      }
      this.feature.setGeometryName("geom");
      this.feature.set("id", 4);
      this.feature.set("name", this.formInline.name);
      // this.feature.setStyle(this.createStyle(this.feature.values_.name));
      this.transact("insert", this.feature, "postgisdaoguan");

      this.isCanUse = false;
      this.overlay.setPosition(null);
      this.addClick();
    },
    transact(transType, feat, layerName) {
      if (layerName == "") {
        return;
      }
      var node;
      var s;
      var formatWFS = new WFS();
      switch (transType) {
        case "insert":
          node = formatWFS.writeTransaction([feat], null, null, {
            featureType: layerName,
            featurePrefix: "dao",
            featureNS: "http://localhost/dao", // 注意这个值必须为创建工作区时的命名空间URI
            srsName: "EPSG:4326"
          });
          break;
        case "update":
          node = formatWFS.writeTransaction(null, [feat], null, {
            featureType: layerName,
            featureNS: "http://localhost/dao", // 注意这个值必须为创建工作区时的命名空间URI
            srsName: "EPSG:4326"
          });
          break;
      }
      s = new XMLSerializer();
      var str = s.serializeToString(node);
      axios({
        method: "post",
        url: "http://localhost:8519/geoserver/dao/wfs",
        data: str,
        headers: {
          "Content-type": "text/xml"
        }
      }).then(res => {
        this.pointSource.clear();
        this.wfsSource = new vectorSource({
          url:
            "http://localhost:8519/geoserver/dao/wfs?" +
            "service=WFS&version=1.1.0&" +
            "request=GetFeature&typeName=dao:postgisdaoguan&" +
            "outputFormat=json&srsname=EPSG:4326",
          format: new GeoJSON({
            geometryName: "geom"
          })
        });
        this.wfsLayer.setSource(this.wfsSource);
      });
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
