<template>
  <div id="app">
    <div class="main container-fluid">
      <b-row>
        <b-col cols="2">
          <Sidebar />
        </b-col>
        <b-col cols="9">
          <transition
            name="fade"
            mode="out-in"
            @beforeLeave="beforeLeave"
            @enter="enter"
            @afterEnter="afterEnter"
          >
            <keep-alive>
              <router-view />
            </keep-alive>
          </transition>
        </b-col>
      </b-row>
    </div>
    <notifications group="main" position="bottom right"></notifications>
  </div>
</template>

<script>
import Sidebar from "@/components/Sidebar.vue";
export default {
  name: "app",
  components: { Sidebar },
  methods: {
    beforeLeave(element) {
      this.prevHeight = getComputedStyle(element).height;
    },
    enter(element) {
      const { height } = getComputedStyle(element);

      element.style.height = this.prevHeight;

      setTimeout(() => {
        element.style.height = height;
      });
    },
    afterEnter(element) {
      element.style.height = "auto";
    }
  }
};
</script>

<style>
.clickable {
  cursor: pointer;
}

.fade-enter-active,
.fade-leave-active {
  transition-duration: 0.3s;
  transition-property: height, opacity;
  transition-timing-function: ease;
  overflow: hidden;
}

.fade-enter,
.fade-leave-active {
  opacity: 0;
}
</style>
