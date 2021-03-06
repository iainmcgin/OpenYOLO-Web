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

import {WindowLike} from '../protocol/comms';
import {DisplayOptions} from '../protocol/rpc_messages';

export const HIDDEN_FRAME_CLASS = 'openyolo-hidden';
export const VISIBLE_FRAME_CLASS = 'openyolo-visible';

const DEFAULT_FRAME_CSS = `
.openyolo-hidden {
  display: none;
}

.openyolo-visible {
  position: fixed;
  border: none;
  z-index: 9999;
  bottom: 0;
  left: 0;
  width: 100%;
}

@media (min-width:801px) {
  .openyolo-visible {
    position: fixed;
    left: auto;
    top: 16px;
    right: 16px;
    width: 320px;
    height: 480px;
  }
}
`;

let defaultCssNode: HTMLStyleElement|null;

function injectDefaultFrameCss() {
  if (defaultCssNode) return;

  defaultCssNode = document.createElement('style');
  defaultCssNode.type = 'text/css';
  defaultCssNode.appendChild(document.createTextNode(DEFAULT_FRAME_CSS));
  document.getElementsByTagName('head')[0].appendChild(defaultCssNode);
}

/**
 * Defines the interface for a valid OpenYolo Relay container that will hold
 * relay-side logic and securely fetch credentials.
 *
 * It is usually an IFrame or a Popup window.
 */
export class ProviderFrameElement {
  private frameElem: HTMLIFrameElement;

  constructor(
      private clientDocument: Document,
      private instanceId: string,
      clientOrigin: string,
      providerUrlBase: string) {
    injectDefaultFrameCss();
    this.frameElem = this.clientDocument.createElement('iframe');
    this.frameElem.src = `${providerUrlBase}` +
        `?client=${encodeURIComponent(clientOrigin)}` +
        `&id=${this.instanceId}`;
    this.frameElem.className = HIDDEN_FRAME_CLASS;
    this.clientDocument.body.appendChild(this.frameElem);
  }

  /**
   * Returns the content window of the container.
   */
  getContentWindow(): WindowLike {
    return this.frameElem.contentWindow;
  }

  /**
   * Displays the container.
   */
  display(options: DisplayOptions): void {
    this.frameElem.className = VISIBLE_FRAME_CLASS;
    if (options.height) {
      this.frameElem.style.height = `${options.height}px`;
    }
  }

  /**
   * Hides the container.
   */
  hide(): void {
    this.frameElem.className = HIDDEN_FRAME_CLASS;
    this.frameElem.style.height = '';
  }

  /**
   * Disposes of the container.
   */
  dispose(): void {
    this.clientDocument.removeChild(this.frameElem);
  }
}
