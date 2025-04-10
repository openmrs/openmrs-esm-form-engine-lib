import React, { createContext } from 'react';
import { jest } from '@jest/globals';

const SingleSpaContext = createContext({ mountParcel: () => jest.fn() });

export { SingleSpaContext };
