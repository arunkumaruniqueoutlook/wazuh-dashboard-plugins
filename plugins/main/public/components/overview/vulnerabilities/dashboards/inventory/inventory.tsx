import React, { useEffect, useMemo, useState } from 'react';
import { IntlProvider } from 'react-intl';
import {
  EuiDataGrid,
  EuiPageTemplate,
  EuiToolTip,
  EuiButtonIcon,
  EuiDataGridCellValueElementProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiButtonEmpty,
} from '@elastic/eui';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { SearchResponse } from '../../../../../../../../src/core/server';
import { HitsCounter } from '../../../../../kibana-integrations/discover/application/components/hits_counter/hits_counter';
import { formatNumWithCommas } from '../../../../../kibana-integrations/discover/application/helpers';
import { getPlugins, getWazuhCorePlugin } from '../../../../../kibana-services';
import {
  ErrorHandler,
  ErrorFactory,
  HttpError,
} from '../../../../../react-services/error-management';
import './inventory.scss';
import { MAX_ENTRIES_PER_QUERY, inventoryTableDefaultColumns } from './config';
import { DiscoverNoResults } from '../../common/components/no_results';
import { LoadingSpinner } from '../../common/components/loading_spinner';
// common components/hooks
import DocViewer from '../../../../common/doc-viewer/doc-viewer';
import useSearchBar from '../../../../common/search-bar/use-search-bar';
import { useAppConfig } from '../../../../common/hooks';
import { useDataGrid } from '../../../../common/data-grid/use-data-grid';
import { useDocViewer } from '../../../../common/doc-viewer/use-doc-viewer';
import { withErrorBoundary } from '../../../../common/hocs';
import { search } from '../../../../common/search-bar/search-bar-service';
import { exportSearchToCSV } from '../../../../common/data-grid/data-grid-service';
import { WAZUH_INDEX_TYPE_VULNERABILITIES } from '../../../../../../common/constants';
import useCheckIndexFields from '../../common/hooks/useCheckIndexFields';

const InventoryVulsComponent = () => {
  const appConfig = useAppConfig();
  const VULNERABILITIES_INDEX_PATTERN_ID =
    appConfig.data['vulnerabilities.pattern'];
  const { searchBarProps } = useSearchBar({
    defaultIndexPatternID: VULNERABILITIES_INDEX_PATTERN_ID,
  });
  const { isLoading, filters, query, indexPatterns } = searchBarProps;
  const SearchBar = getPlugins().data.ui.SearchBar;
  const [results, setResults] = useState<SearchResponse>({} as SearchResponse);
  const [inspectedHit, setInspectedHit] = useState<any>(undefined);
  const [indexPattern, setIndexPattern] = useState<IndexPattern | undefined>(
    undefined,
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const sideNavDocked = getWazuhCorePlugin().hooks.useDockedSideNav();

  const onClickInspectDoc = useMemo(
    () => (index: number) => {
      const rowClicked = results.hits.hits[index];
      setInspectedHit(rowClicked);
    },
    [results],
  );

  const DocViewInspectButton = ({
    rowIndex,
  }: EuiDataGridCellValueElementProps) => {
    const inspectHintMsg = 'Inspect document details';
    return (
      <EuiToolTip content={inspectHintMsg}>
        <EuiButtonIcon
          onClick={() => onClickInspectDoc(rowIndex)}
          iconType='inspect'
          aria-label={inspectHintMsg}
        />
      </EuiToolTip>
    );
  };

  const dataGridProps = useDataGrid({
    ariaLabelledBy: 'Vulnerabilities Inventory Table',
    defaultColumns: inventoryTableDefaultColumns,
    results,
    indexPattern: indexPattern as IndexPattern,
    DocViewInspectButton,
  });

  const { pagination, sorting, columnVisibility } = dataGridProps;

  const docViewerProps = useDocViewer({
    doc: inspectedHit,
    indexPattern: indexPattern as IndexPattern,
  });

  const {
    isError,
    error,
    isSuccess,
    resultIndexData,
    isLoading: isLoadingCheckIndex,
  } = useCheckIndexFields(
    VULNERABILITIES_INDEX_PATTERN_ID,
    indexPatterns?.[0],
    WAZUH_INDEX_TYPE_VULNERABILITIES,
    filters,
    query,
  );

  useEffect(() => {
    if (!isLoading && isSuccess) {
      setIndexPattern(indexPatterns?.[0] as IndexPattern);
      search({
        indexPattern: indexPatterns?.[0] as IndexPattern,
        filters,
        query,
        pagination,
        sorting,
      })
        .then(results => {
          setResults(results);
          setIsSearching(false);
        })
        .catch(error => {
          const searchError = ErrorFactory.create(HttpError, {
            error,
            message: 'Error fetching vulnerabilities',
          });
          ErrorHandler.handleError(searchError);
          setIsSearching(false);
        });
    }
  }, [
    JSON.stringify(searchBarProps),
    JSON.stringify(pagination),
    JSON.stringify(sorting),
    isLoadingCheckIndex,
  ]);

  const onClickExportResults = async () => {
    const params = {
      indexPattern: indexPatterns?.[0] as IndexPattern,
      filters,
      query,
      fields: columnVisibility.visibleColumns,
      pagination: {
        pageIndex: 0,
        pageSize: results.hits.total,
      },
      sorting,
    };
    try {
      setIsExporting(true);
      await exportSearchToCSV(params);
    } catch (error) {
      const searchError = ErrorFactory.create(HttpError, {
        error,
        message: 'Error downloading csv report',
      });
      ErrorHandler.handleError(searchError);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <IntlProvider locale='en'>
      <EuiPageTemplate
        className='vulsInventoryContainer'
        restrictWidth='100%'
        fullHeight={true}
        grow
      >
        <>
          {isLoading || isLoadingCheckIndex ? (
            <LoadingSpinner />
          ) : (
            <SearchBar
              appName='inventory-vuls'
              {...searchBarProps}
              showDatePicker={false}
              showQueryInput={true}
              showQueryBar={true}
            />
          )}
          {isSearching ? <LoadingSpinner /> : null}
          {!isLoading &&
          !isSearching &&
          (isError ||
            results?.hits?.total === 0 ||
            resultIndexData?.hits?.total === 0) ? (
            <DiscoverNoResults message={error?.message} />
          ) : null}
          {!isLoading &&
          !isSearching &&
          isSuccess &&
          results?.hits?.total > 0 ? (
            <EuiDataGrid
              className={sideNavDocked ? 'dataGridDockedNav' : ''}
              {...dataGridProps}
              className={sideNavDocked ? 'dataGridDockedNav' : ''}
              toolbarVisibility={{
                additionalControls: (
                  <>
                    <HitsCounter
                      hits={results?.hits?.total}
                      showResetButton={false}
                      onResetQuery={() => {}}
                      tooltip={
                        results?.hits?.total &&
                        results?.hits?.total > MAX_ENTRIES_PER_QUERY
                          ? {
                              ariaLabel: 'Warning',
                              content: `The query results has exceeded the limit of 10,000 hits. To provide a better experience the table only shows the first ${formatNumWithCommas(
                                MAX_ENTRIES_PER_QUERY,
                              )} hits.`,
                              iconType: 'alert',
                              position: 'top',
                            }
                          : undefined
                      }
                    />
                    <EuiButtonEmpty
                      disabled={
                        results?.hits?.total === 0 ||
                        !columnVisibility?.visibleColumns?.length
                      }
                      size='xs'
                      iconType='exportAction'
                      color='primary'
                      isLoading={isExporting}
                      className='euiDataGrid__controlBtn'
                      onClick={onClickExportResults}
                    >
                      Export Formated
                    </EuiButtonEmpty>
                  </>
                ),
              }}
            />
          ) : null}
          {inspectedHit && (
            <EuiFlyout onClose={() => setInspectedHit(undefined)} size='m'>
              <EuiFlyoutHeader>
                <EuiTitle>
                  <h2>Document details</h2>
                </EuiTitle>
              </EuiFlyoutHeader>
              <EuiFlyoutBody>
                <EuiFlexGroup direction='column'>
                  <EuiFlexItem>
                    <DocViewer {...docViewerProps} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutBody>
            </EuiFlyout>
          )}
        </>
      </EuiPageTemplate>
    </IntlProvider>
  );
};

export const InventoryVuls = withErrorBoundary(InventoryVulsComponent);
