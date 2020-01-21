<template>
    <div class="center-parent">
        <div class="center-child">
            <b-img fluid src="../assets/sqan_logo_full.png"/>
            <hr>

            <div class="login-form">
                <form>
                    <h2 class="text-center">Log in</h2>
                    <div class="form-group">
                        <input type="text" class="form-control" placeholder="Username" v-model="form.username" required="required">
                    </div>
                    <div class="form-group">
                        <input type="password" class="form-control" placeholder="Password" v-model="form.password" required="required">
                    </div>
                    <div class="form-group">
                        <button class="btn btn-primary btn-block" @click.prevent="userLogin()">Log in</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script>

    import { mapActions } from 'vuex';

    export default {
        name: 'signin',
        data() {
            return {
                form: {
                    username: '',
                    password: ''
                }
            }
        },
        methods: {
            ...mapActions(['login']),

            userLogin: function() {
                let self = this;
                this.$http.post('http://sqan-test.sca.iu.edu/api/qc/userLogin', {user: self.form})
                    .then(function(res) {
                        console.log(res.data);
                        self.login(res.data);
                        setTimeout(() => {
                            console.log('pushing route');
                            self.$router.push({path: '/exams'});
                        }, 300)
                    }, function(err) {
                        console.log(err);
                    })
            },
        }
    }
</script>

<style>
    body {
        /*TODO Let background image customizable? */
        background-color: #484f56;
    }

    .login-form {
        width: 340px;
        margin: 50px auto;
    }
    .login-form form {
        margin-bottom: 15px;
        background: #f7f7f7;
        box-shadow: 0px 2px 2px rgba(0, 0, 0, 0.3);
        padding: 30px;
    }
    .login-form h2 {
        margin: 0 0 15px;
    }
    .form-control, .btn {
        min-height: 38px;
        border-radius: 2px;
    }
    .btn {
        font-size: 15px;
        font-weight: bold;
    }

    .center-parent {
        position: relative;
        width: 100%;
        min-height: 100vh;
    }
    .center-child {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
</style>
