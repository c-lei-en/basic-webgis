import Vue from 'vue'
import Router from 'vue-router'
import basicLayer from '@/components/basicLayer'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'basicLayer',
      component: basicLayer
    }
  ]
})
