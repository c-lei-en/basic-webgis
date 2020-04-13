import Vue from 'vue'
import Router from 'vue-router'
import basicLayer from '@/components/basicLayer'
import dealLayer from '@/components/dealLayer'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'basicLayer',
      component: basicLayer
    },
    {
      path: '/dealLayer',
      name: 'dealLayer',
      component: dealLayer
    }
  ]
})
