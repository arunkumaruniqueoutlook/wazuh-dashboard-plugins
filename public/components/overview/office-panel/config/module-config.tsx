/*
 * Wazuh app - Office 365 ModuleConfig.
 *
 * Copyright (C) 2015-2021 Wazuh, Inc.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * Find more information about this on the LICENSE file.
 */

import React from 'react';
import { OfficeBody, OfficeDrilldown } from '../views';
import { MainViewConfig } from './';
import { drilldownConfig } from './drilldown-ip-config';

const drilldownUserConfig = drilldownConfig('Wazuh-App-Overview-Office-User-Operation-Level-Table');
const drilldownIPConfig = drilldownConfig(
  'Wazuh-App-Overview-Office-Client-IP-Operation-Level-Table'
);

export const ModuleConfig = {
  main: {
    length: () => MainViewConfig.rows.reduce((total, row) => total + row.columns.length, 0),
    component: (props) => <OfficeBody {...{ ...MainViewConfig, ...props }} />,
  },
  'data.office365.UserId': {
    length: () => drilldownUserConfig.rows.reduce((total, row) => total + row.columns.length, 0),
    component: (props) => (
      <OfficeDrilldown title={'User Activity'} {...{ ...drilldownUserConfig, ...props }} />
    ),
  },
  'data.office365.ClientIP': {
    length: () => drilldownIPConfig.rows.reduce((total, row) => total + row.columns.length, 0),
    component: (props) => (
      <OfficeDrilldown title={'Client IP'} {...{ ...drilldownIPConfig, ...props }} />
    ),
  },
  'rule.description': {
    length: () => drilldownIPConfig.rows.reduce((total, row) => total + row.columns.length, 0),
    component: (props) => (
      <OfficeDrilldown title={'Rule Description'} {...{ ...drilldownIPConfig, ...props }} />
    ),
  },
};
