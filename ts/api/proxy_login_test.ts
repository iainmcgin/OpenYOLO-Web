/*
 * Copyright 2017 The OpenYOLO for Web Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {AUTHENTICATION_METHODS, Credential} from '../protocol/data';
import {OpenYoloError} from '../protocol/errors';
import {errorMessage, proxyLoginMessage, proxyLoginResponseMessage} from '../protocol/rpc_messages';
import {SecureChannel} from '../protocol/secure_channel';
import {FakeProviderConnection} from '../test_utils/channels';
import {createSpyFrame} from '../test_utils/frames';
import {JasmineTimeoutManager} from '../test_utils/timeout';

import {ProxyLogin} from './proxy_login';

describe('ProxyLogin', () => {
  let request: ProxyLogin;
  let clientChannel: SecureChannel;
  let providerChannel: SecureChannel;
  let frame: any;
  let timeoutManager = new JasmineTimeoutManager();
  let credential: Credential = {
    id: 'user@example.com',
    displayName: 'User',
    password: 'password',
    authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
    profilePicture: null,
    proxiedAuthRequired: false
  };

  beforeEach(() => {
    let connection = new FakeProviderConnection();
    clientChannel = connection.clientChannel;
    providerChannel = connection.providerChannel;
    frame = createSpyFrame('frameId');
    request = new ProxyLogin(frame, clientChannel);
    spyOn(request, 'dispose').and.callThrough();
    timeoutManager.install();
  });

  afterEach(() => {
    request.dispose();
    timeoutManager.uninstall();
  });

  it('sets a 10 sec timeout', done => {
    request.dispatch(credential).then(() => done.fail(), () => done());
    jasmine.clock().tick(10001);
  });

  describe('dispatch', () => {
    it('should send a RPC message to the frame', () => {
      spyOn(clientChannel, 'send').and.callThrough();
      request.dispatch(credential);
      expect(clientChannel.send)
          .toHaveBeenCalledWith(proxyLoginMessage(request.id, credential));
    });
  });

  describe('handleResponse', () => {
    it('resolves when the valid proxy login message is received',
       async function(done) {
         let expectedResponse = {statusCode: 200, responseText: 'SUCCESS'};
         let promise = request.dispatch(credential);

         // Ignore a message with the wrong id
         providerChannel.send(proxyLoginResponseMessage(
             'otherId', {statusCode: 200, responseText: 'OK'}));
         expect(request.dispose).not.toHaveBeenCalled();

         // Accept a valid message.
         providerChannel.send(
             proxyLoginResponseMessage(request.id, expectedResponse));

         try {
           let result = await promise;
           expect(result).toBe(expectedResponse);
           expect(request.dispose).toHaveBeenCalled();
           done();
         } catch (err) {
           done.fail('Promise should resolve');
         }
       });

    it('rejects if an error message is received', async function(done) {
      let promise = request.dispatch(credential);

      let expectedError = OpenYoloError.requestFailed('error!');
      providerChannel.send(errorMessage(request.id, expectedError));

      try {
        await promise;
        done.fail('Promise should reject');
      } catch (err) {
        expect(err).toEqual(expectedError);
        expect(request.dispose).toHaveBeenCalled();
        done();
      }
    });
  });
});
