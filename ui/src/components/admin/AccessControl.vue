<template>
  <div>
    <uib-tab index="2" select="active_tab = 2">
      <uib-tab-heading>
        <i class="fa fa-fw fa-unlock-alt"></i> ACL
      </uib-tab-heading>
      <table class="table table-condensed table-bordered">
        <thead>
          <tr>
            <th ng-click="toggle_selectall()">
              <i
                class="text-info fa fa-fw"
                ng-class="{'fa-check-square-o': selectall, 'fa-square-o': !selectall}"
              >
              </i>
            </th>
            <th>IIBISID</th>
            <th width="40%">Can View/Comment</th>
            <th width="40%">Can QC</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="iibisid in iibisids | filter:research_filter"
            ng-init="_selected[iibisid] = false;"
          >
            <td ng-click="_selected[iibisid] = !_selected[iibisid]">
              <i
                class="text-info fa fa-fw"
                ng-class="{'fa-check-square-o': _selected[iibisid], 'fa-square-o': !_selected[iibisid]}"
              >
              </i>
            </td>
            <th>{{ iibisid }}</th>
            <td>
              <ui-select multiple ng-model="_acl[iibisid].view.groups">
                <ui-select-match
                  placeholder="Select groups who can view this research"
                >
                  <b>{{ $item.name }}</b>
                  <!--<span v-for="member in $item.Members">{{member.fullname}} | </span>-->
                  <span class="text-muted"
                    >({{ $item.members.length }} users)</span
                  >
                </ui-select-match>
                <ui-select-choices
                  repeat="group in groups | propsFilter: {name: $select.search}"
                >
                  <b>{{ group.name }}</b>
                  <span class="text-muted">{{ group.desc }}</span>
                  <!--<span v-for="member in group.Members">{{member.fullname}} | </span>-->
                  <span class="text-muted"
                    >({{ group.members.length }} users)</span
                  >
                </ui-select-choices>
              </ui-select>
            </td>
            <td>
              <ui-select multiple ng-model="_acl[iibisid].qc.groups">
                <ui-select-match
                  placeholder="Select groups who can QC this research"
                >
                  <b>{{ $item.name }}</b>
                  <!--<span v-for="member in $item.Members">{{member.fullname}} | </span>-->
                  <span class="text-muted"
                    >({{ $item.members.length }} users)</span
                  >
                </ui-select-match>
                <ui-select-choices
                  repeat="group in groups | propsFilter: {name: $select.search}"
                >
                  <b>{{ group.name }}</b>
                  <span class="text-muted">{{ group.desc }}</span>
                  <!--<span v-for="member in group.Members">{{member.fullname}} | </span>-->
                  <span class="text-muted"
                    >({{ group.members.length }} users)</span
                  >
                </ui-select-choices>
              </ui-select>
            </td>
          </tr>
        </tbody>
      </table>

      <input
        class="btn btn-primary pull-right"
        value="Update Access"
        ng-click="update_acl();"
      />
      <input
        class="btn btn-info pull-right"
        value="ReQC ({{selectedCount()}})"
        ng-click="reqc()"
      />
    </uib-tab>
  </div>
</template>
