import React from 'react';
import {View} from 'react-native';
import {useOnyx} from 'react-native-onyx';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormOnyxValues} from '@components/Form/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TextInput from '@components/TextInput';
import useAutoFocusInput from '@hooks/useAutoFocusInput';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {updateAdvancedFilters} from '@libs/actions/Search';
import Navigation from '@libs/Navigation/Navigation';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import INPUT_IDS from '@src/types/form/SearchAdvancedFiltersForm';

function SearchFiltersReportIDPage() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const [searchAdvancedFiltersForm] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM);
    const reportID = searchAdvancedFiltersForm?.[INPUT_IDS.REPORT_ID];
    const {inputCallbackRef} = useAutoFocusInput();

    const updateReportIDFilter = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM>) => {
        updateAdvancedFilters(values);
        Navigation.goBack(ROUTES.SEARCH_ADVANCED_FILTERS);
    };

    return (
        <ScreenWrapper
            testID={SearchFiltersReportIDPage.displayName}
            shouldShowOfflineIndicatorInWideScreen
            offlineIndicatorStyle={styles.mtAuto}
        >
            <FullPageNotFoundView shouldShow={false}>
                <HeaderWithBackButton title={translate('common.reportID')} />
                <FormProvider
                    style={[styles.flex1, styles.ph5]}
                    formID={ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM}
                    onSubmit={updateReportIDFilter}
                    submitButtonText={translate('common.save')}
                    enabledWhenOffline
                >
                    <View style={styles.mb4}>
                        <InputWrapper
                            InputComponent={TextInput}
                            inputID={INPUT_IDS.REPORT_ID}
                            name={INPUT_IDS.REPORT_ID}
                            defaultValue={reportID}
                            label={translate('common.reportID')}
                            accessibilityLabel={translate('common.reportID')}
                            role={CONST.ROLE.PRESENTATION}
                            ref={inputCallbackRef}
                        />
                    </View>
                </FormProvider>
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

SearchFiltersReportIDPage.displayName = 'SearchFiltersReportIDPage';

export default SearchFiltersReportIDPage;
