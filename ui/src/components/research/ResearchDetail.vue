<template>
  <v-card
    class="mx-auto"
    tile
  >
    <v-toolbar
      color="blue"
      dark
    >
      <v-toolbar-title>{{research.iibis_project_id}} - {{research.short_title}}</v-toolbar-title>
    </v-toolbar>
    <v-list dense>

      <v-list-item>
        <v-list-item-avatar>
          <v-icon>mdi-account-circle</v-icon>
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>PI</v-list-item-title>
          <v-list-item-subtitle>{{research.pi_first_name}} {{research.pi_last_name}} ({{research.email_address}})</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-avatar>
          <v-icon>mdi-calendar</v-icon>
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>Dates</v-list-item-title>
          <v-list-item-subtitle>{{research.start_date}} - {{research.end_date | moment}}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>

      <v-list-item>
        <v-list-item-avatar>
          <v-icon>mdi-check</v-icon>
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>Status</v-list-item-title>
          <v-list-item-subtitle>{{research.project_status}}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>

      <v-list-item>
        <v-list-item-avatar>
          <v-icon>mdi-flask</v-icon>
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>Type of Study</v-list-item-title>
          <v-list-item-subtitle>{{research.study_type}}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>

      <v-list-item>
        <v-list-item-avatar>
          <v-icon>mdi-chart-bar</v-icon>
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>Area of Study</v-list-item-title>
          <v-list-item-subtitle>{{research.area_of_study}}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>

      <v-list-item>
        <v-list-item-avatar>
          <v-icon>mdi-sitemap</v-icon>
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>Modality/Lab</v-list-item-title>
          <v-list-item-subtitle>{{research.modality_or_laboratory}}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>

      <v-list-item>
        <v-list-item-avatar>
          <v-icon>mdi-card-account-details</v-icon>
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>Full Title</v-list-item-title>
          <v-list-item-subtitle>{{research.full_title}}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>

    </v-list>
  </v-card>
</template>

<script>

  export default {
    name: 'ResearchDetail',
    props: {
      research: Object
    }
  }
</script>
