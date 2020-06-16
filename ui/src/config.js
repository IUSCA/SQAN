const exports = {
  mode: 'production',
  api: 'https://sqan-test.sca.iu.edu/api/qc',
  iucas_url: 'https://cas.iu.edu/cas/login',
  cas_return: 'http://localhost:8080/signin',
  default_redirect: '/signin',
  upload_enabled: true
};

export default exports;
