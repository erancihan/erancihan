import R from './index';

const Fields = [];

const req = R(api, Fields);
req.build('/some/url/$', '1337dood');
req.make();
