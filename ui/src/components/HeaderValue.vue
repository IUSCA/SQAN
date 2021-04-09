<template>
    <span>
        <template v-if="_key.endsWith('Sequence')">
          <li v-for="(v, k) in _val[0]" :key="k">
              {{v.Name}}
              <template v-if="Array.isArray(v.Value)">
                  <div v-for="(v1, k1) in v.Value[0]" :key="k1">
                    <span class="ml-2">
                        - {{v1.Name}} : {{v1.Value}}
                    </span>
                  </div>
              </template>
                <template v-else>
                   : {{v.Value}}
                </template>
          </li>
        </template>
          <template v-else>
              <span v-if="Array.isArray(_val)">
                  <div v-for="(vx, idx) in _val" :key="idx">
                      {{vx}}
                  </div>
              </span>

              <div v-if="!Array.isArray(_val)">
                  {{_val}}
              </div>
          </template>
    </span>
</template>

<script>
  export default {
    name: 'HeaderValue',
    props: {_key: String, _val: [Number, String, Array, Object, Boolean]}
  }
</script>
