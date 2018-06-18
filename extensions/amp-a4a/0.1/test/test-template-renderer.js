/**
 * Copyright 2018 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as sinon from 'sinon';
import {
  AMP_TEMPLATED_CREATIVE_HEADER_NAME,
  TemplateValidator,
  getAmpAdTemplateHelper,
} from '../template-validator';
import {TemplateRenderer} from '../template-renderer';
import {ValidatorResult} from '../amp-ad-type-defs';
import {data} from './testdata/valid_css_at_rules_amp.reserialized';
import {utf8Encode} from '../../../../src/utils/bytes';

const realWinConfig = {
  amp: {},
  ampAdCss: true,
  allowExternalResources: true,
};

describes.realWin('TemplateValidator', realWinConfig, env => {

  const templateUrl = 'https://adnetwork.com/amp-template.html';
  const headers = {
    get: name => {
      if (name == AMP_TEMPLATED_CREATIVE_HEADER_NAME) {
        return 'amp-mustache';
      }
    },
  };

  let containerElement;
  let context;
  let renderer;
  let validator;
  let validatorPromise;
  let sandbox;

  beforeEach(() => {
    renderer = new TemplateRenderer();
    validator = new TemplateValidator();

    containerElement = document.createElement('div');
    containerElement.setAttribute('height', 50);
    containerElement.setAttribute('width', 320);
    containerElement.signals = () => ({
      whenSignal: () => Promise.resolve(),
    });
    containerElement.renderStarted = () => {};
    containerElement.getPageLayoutBox = () => ({
      left: 0, top: 0, width: 0, height: 0,
    });
    containerElement.getLayoutBox = () => ({
      left: 0, top: 0, width: 0, height: 0,
    });
    containerElement.getIntersectionChangeEntry = () => ({});
    containerElement.isInViewport = () => true;
    document.body.appendChild(containerElement);

    context = {
      win: env.win,
      ampDoc: env.ampdoc,
      requestUrl: 'http://www.google.com',
      size: {width: '320', height: '50'},
      sentinel: 's-1234',
    };

    sandbox = sinon.sandbox.create();
    sandbox.stub(getAmpAdTemplateHelper(env.win), 'fetch').callsFake(url => {
      expect(url).to.equal(templateUrl);
      return Promise.resolve(data.adTemplate);
    });

    validatorPromise = validator.validate(context,
        utf8Encode(JSON.stringify({
          templateUrl,
          data: {url: 'https://buy.com/buy-1'},
          analytics: {foo: 'bar'},
        })), headers);
  });

  afterEach(() => sandbox.restore());

  it('should have AMP validator result', () => {
    return validatorPromise.then(validatorOutput => {

      // Sanity check. This behavior is tested in teest-template-validator.js.
      expect(validatorOutput).to.be.ok;
      expect(validatorOutput.type).to.equal(ValidatorResult.AMP);
      return renderer.render(context, containerElement, validatorOutput)
          .then(() => {
            const iframe = containerElement.querySelector('iframe');
            expect(iframe).to.be.ok;
            expect(iframe.contentWindow.document.body.innerHTML)
                .to.equal('');
          });
    });
  });
});

