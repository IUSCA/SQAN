<template>
  <v-list dense>
    <v-list-item to="about">
      <v-list-item-action>
        <img src="../assets/sqan_logo.png" width="32">
      </v-list-item-action>
      <v-list-item-content>
        <v-list-item-title class="title">
          SQAN
        </v-list-item-title>
        <v-list-item-subtitle>
          development
        </v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>
    <v-divider class="mb-5"></v-divider>
    <v-list-item v-for="item in items" :value="item.active" :key="item.title" :to="item.path">
      <v-list-item-action>
        <v-icon>{{item.action}}</v-icon>
      </v-list-item-action>
      <v-list-item-content>
        <v-list-item-title>{{item.title}}</v-list-item-title>
      </v-list-item-content>
    </v-list-item>
    <v-divider class="mb-5"></v-divider>
    <v-list-item v-for="item in admin_items" :value="item.active" :key="item.title" :to="item.path">
      <v-list-item-action>
        <v-icon>{{item.action}}</v-icon>
      </v-list-item-action>
      <v-list-item-content>
        <v-list-item-title>{{item.title}}</v-list-item-title>
      </v-list-item-content>
    </v-list-item>
    <v-divider class="mb-5"></v-divider>
    <v-list-item v-for="item in user_items" :value="item.active" :key="item.title" :to="item.path">
      <v-list-item-action>
        <v-icon>{{item.action}}</v-icon>
      </v-list-item-action>
      <v-list-item-content>
        <v-list-item-title>{{item.title}}</v-list-item-title>
      </v-list-item-content>
    </v-list-item>
  </v-list>
</template>

<script>
  export default {
    name: 'Drawer',
    data() {
      return {
        items: [
          {
            action: 'mdi-microscope',
            title: 'Exams',
            path: 'exams',
          },
          {
            action: 'mdi-checkbox-multiple-blank',
            title: 'Templates',
            path: 'templatesummary',
          },
          {
            action: 'mdi-flask',
            title: 'Research',
            path: 'researchsummary',
          },
        ],
        user_items: [
          {
            action: 'mdi-account-details',
            title: 'Profile',
            path: 'profile',
          },
          {
            action: 'mdi-logout-variant',
            title: 'Logout',
            path: 'logout',
          },
        ],
        admin_items: [
          {
            action: 'mdi-file-key',
            title: 'QC Keys',
            path: 'qckeys',
          },
          {
            action: 'mdi-upload',
            title: 'Upload',
            path: 'upload',
          },
          {
            action: 'mdi-cube-send',
            title: 'Dataflow',
            path: 'dataflow',
          },
          {
            action: 'mdi-shield-check',
            title: 'Access Control',
            path: 'admin',
          },
        ]
      }
    }
  }
</script>

<style>
  a {
    text-decoration: none !important;
  }
</style>
