<template>
  <view class="container">
    <!-- 顶部切换和日期导航 -->
    <view class="header">
      <view class="stat-type-selector">
        <view
          v-for="(type, index) in statTypes"
          :key="index"
          class="stat-type-item"
          :class="{ active: currentStatType === type.value }"
          @click="currentStatType = type.value"
        >
          {{ type.label }}
        </view>
      </view>
      
      <!-- 日期导航 -->
      <view class="date-navigation">
        <view class="nav-btn" @click="navigatePrevious">
          <text class="nav-icon">◀</text>
        </view>
        <picker
          class="date-picker"
          :mode="pickerMode"
          :fields="pickerFields"
          :value="formatDate(currentDate)"
          @change="onDateChange"
        >
          <view class="current-date">
            {{ formatDisplayDate(currentDate) }}
        </view>
      </picker>
        <view class="nav-btn" @click="navigateNext">
          <text class="nav-icon">▶</text>
        </view>
      </view>
    </view>

    <!-- 统计概览 -->
    <view class="overview">
      <view class="overview-item">
        <text class="overview-label">总支出</text>
        <text class="overview-value">¥{{ totalExpense.toFixed(2) }}</text>
      </view>
    </view>

    <!-- 图表容器 -->
    <view class="chart-container">
      <view class="chart-wrapper">
        <view class="chart-title">
          <view class="chart-title-text">
            <text class="chart-icon">📊</text>
            {{ chartTitle }}
          </view>
        </view>
        <view v-if="expenseCategories.length === 0" class="chart-empty">
          <image src="@/static/images/empty.svg" mode="aspectFit" class="empty-image"></image>
          <text>暂无记录</text>
        </view>
        <view v-else class="chart">
          <!-- 柱状图 - 垂直显示（日期在x轴，金额在y轴） -->
          <view class="bar-chart-wrapper vertical">
            <!-- 当需要滚动时使用scroll-view -->
            <scroll-view 
              v-if="chartData.length > 0 && chartData[0].needScroll" 
              class="bar-scroll smooth-scroll"
              scroll-x
            >
              <view class="bar-inner vertical" :class="{'week-view': currentStatType === 'week'}">
                <view
                  v-for="(item, index) in chartData"
                  :key="index"
                  class="bar-item vertical"
                  :class="{ 'bar-active': selectedBarDate === item.date }"
                  @click="selectBar(item.date)"
                >
                  <text class="bar-amount vertical" v-if="item.expense > 0">
                    ¥{{ item.expense.toFixed(0) }}
                  </text>
                  <view class="bar-container vertical">
                    <view
                      class="bar vertical"
                      :style="{
                        height: item.height + '%',
                        backgroundColor: getBarColor(item, index)
                      }"
                    ></view>
                  </view>
                  <text class="bar-label vertical">{{ item.label }}</text>
                </view>
              </view>
            </scroll-view>
            
            <!-- 对于不需要滚动的视图，直接使用常规视图 -->
            <view v-else class="bar-inner vertical no-scroll" :class="{'week-view': currentStatType === 'week'}">
              <view
                v-for="(item, index) in chartData"
                :key="index"
                class="bar-item vertical"
                :class="{ 'bar-active': selectedBarDate === item.date }"
                @click="selectBar(item.date)"
              >
                <text class="bar-amount vertical" v-if="item.expense > 0">
                  ¥{{ item.expense.toFixed(0) }}
                </text>
                <view class="bar-container vertical">
                  <view
                    class="bar vertical"
                    :style="{
                      height: item.height + '%',
                      backgroundColor: getBarColor(item, index)
                    }"
                  ></view>
                </view>
                <text class="bar-label vertical">{{ item.label }}</text>
              </view>
            </view>
          </view>
  
          <!-- 类别分布 -->
          <view class="category-distribution">
            <text class="distribution-title">支出分类</text>
            <view class="category-list">
        <view 
                v-for="(category, index) in expenseCategories"
          :key="index"
          class="category-item"
        >
          <view class="category-info">
                  <view class="category-icon">{{ getCategoryIcon(category.name) }}</view>
                  <view class="category-detail">
                    <text class="category-name">{{ category.name }}</text>
                    <text class="category-percentage">{{ category.percentage }}%</text>
                  </view>
                </view>
                <text class="category-amount">¥{{ category.amount.toFixed(2) }}</text>
              </view>
          </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// 定义响应式变量
const statTypes = ref([
  { label: '周统计', value: 'week' },
  { label: '月统计', value: 'month' },
  { label: '年统计', value: 'year' }
])
const currentStatType = ref('month')
const currentDate = ref(new Date())
const totalExpense = ref(0)
const expenseCategories = ref([])
const chartData = ref([])
const selectedBarDate = ref('')

// 计算属性：根据当前统计类型返回picker的mode和fields
const pickerMode = computed(() => {
  return 'date'
})

const pickerFields = computed(() => {
  switch (currentStatType.value) {
    case 'week': return 'day'
    case 'month': return 'month'
    case 'year': return 'year'
    default: return 'month'
  }
})

// 添加chartTitle计算属性
const chartTitle = computed(() => {
  switch (currentStatType.value) {
    case 'week':
      return '本周消费趋势';
    case 'month':
      return '本月消费趋势';
    case 'year':
      return '全年消费趋势';
    default:
      return '消费趋势';
  }
})

// 监听统计类型变化
watch(currentStatType, (newType) => {
  getStatistics()
})

// 导航到上一个时间段
const navigatePrevious = () => {
  const date = new Date(currentDate.value)
  switch (currentStatType.value) {
    case 'week':
      date.setDate(date.getDate() - 7)
      break
    case 'month':
      date.setMonth(date.getMonth() - 1)
      break
    case 'year':
      date.setFullYear(date.getFullYear() - 1)
      break
  }
  currentDate.value = date
  getStatistics()
}

// 导航到下一个时间段
const navigateNext = () => {
  const date = new Date(currentDate.value)
  switch (currentStatType.value) {
    case 'week':
      date.setDate(date.getDate() + 7)
      break
    case 'month':
      date.setMonth(date.getMonth() + 1)
      break
    case 'year':
      date.setFullYear(date.getFullYear() + 1)
      break
  }
  currentDate.value = date
  getStatistics()
}

// 日期选择器变化
const onDateChange = (e) => {
  const dateStr = e.detail.value
  
  if (currentStatType.value === 'week') {
    // 周统计，直接使用选择的日期
    const [year, month, day] = dateStr.split('-').map(Number)
    currentDate.value = new Date(year, month - 1, day)
  } else if (currentStatType.value === 'month') {
    // 月统计，使用选择的月份的第1天
    const [year, month] = dateStr.split('-').map(Number)
    currentDate.value = new Date(year, month - 1, 1)
  } else if (currentStatType.value === 'year') {
    // 年统计，使用选择的年份的1月1日
    const year = parseInt(dateStr.split('-')[0])
    currentDate.value = new Date(year, 0, 1)
  }
  
  getStatistics()
}

// 获取统计数据
const getStatistics = () => {
  switch (currentStatType.value) {
    case 'week':
      getWeekRecords()
      break
    case 'month':
      getMonthRecords()
      break
    case 'year':
      getYearRecords()
      break
  }
}

// 添加一个辅助函数，判断两个日期是否在同一天/周/月/年
const isSamePeriod = (date1, date2, type) => {
  switch(type) {
    case 'day':
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getDate() === date2.getDate();
    case 'week':
      // 获取两个日期所在周的起始日期，比较起始日期是否相同
      const getWeekStart = (date) => {
        const dayOfWeek = date.getDay() || 7; // 周日是0，转为7
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - (dayOfWeek - 1));
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
      };
      const start1 = getWeekStart(date1);
      const start2 = getWeekStart(date2);
      return start1.getTime() === start2.getTime();
    case 'month':
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth();
    case 'year':
      return date1.getFullYear() === date2.getFullYear();
    default:
      return false;
  }
};

// 获取周统计数据
const getWeekRecords = () => {
  // 获取所选日期所在周的起始日期（周一）和结束日期（周日）
  const currentDay = currentDate.value.getDay() || 7 // 获取当前是周几，周日是0，转为7
  const mondayOffset = currentDay - 1 // 计算到周一的偏移天数
  
  const weekStart = new Date(currentDate.value)
  weekStart.setDate(currentDate.value.getDate() - mondayOffset)
  weekStart.setHours(0, 0, 0, 0)
  
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  
  // 获取所有记录
  const allRecords = uni.getStorageSync('records') || []
  
  // 过滤出本周的记录
  const weekRecords = allRecords.filter(record => {
    const recordDate = new Date(record.date)
    return recordDate >= weekStart && recordDate <= weekEnd && record.type === 'expense'
  })
  
  // 处理数据并更新图表
  processWeekData(weekRecords, weekStart)
}

// 处理周数据
const processWeekData = (records, weekStart) => {
  // 计算总支出
  totalExpense.value = records.reduce((sum, record) => sum + parseFloat(record.amount), 0)
  
  // 按类别统计
  const categories = {}
  records.forEach(record => {
    const category = record.category
    if (!categories[category]) {
      categories[category] = 0
    }
    categories[category] += parseFloat(record.amount)
  })
  
  // 格式化类别数据
  expenseCategories.value = Object.keys(categories)
    .map(name => {
      const amount = categories[name]
      const percentage = totalExpense.value > 0 
        ? Math.round((amount / totalExpense.value) * 100) 
        : 0
      return { name, amount, percentage }
    })
    .sort((a, b) => b.amount - a.amount)
  
  // 生成柱状图数据
  chartData.value = []
  const weekdays = ['一', '二', '三', '四', '五', '六', '日']
  
  // 为每一天创建临时数组，准备计算合适的柱形高度
  const dailyExpenses = []
  
  // 为每一天创建数据点
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    day.setHours(0, 0, 0, 0)
    
    const dayStr = formatShortDate(day)
    const dayNumber = day.getDate() // 获取日期的天数
    
    // 计算当天支出
    const dayExpense = records
      .filter(record => {
        const recordDate = new Date(record.date)
        return recordDate.getFullYear() === day.getFullYear()
          && recordDate.getMonth() === day.getMonth()
          && recordDate.getDate() === day.getDate()
      })
    .reduce((sum, record) => sum + parseFloat(record.amount), 0)
    
    dailyExpenses.push(dayExpense)
  }
  
  // 分析数据差异，找出最大值和次大值
  const sortedExpenses = [...dailyExpenses].sort((a, b) => b - a)
  const maxExpense = sortedExpenses[0] || 0
  const secondMax = sortedExpenses[1] || 0
  
  // 如果最大值远大于次大值(超过5倍)，则调整最大值的显示比例
  const heightAdjustment = maxExpense > secondMax * 5 && secondMax > 0 ? 0.6 : 1
  
  // 生成最终数据
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    const dayStr = formatShortDate(day)
    const dayNumber = day.getDate()
    const dayExpense = dailyExpenses[i]
    
    // 计算高度百分比，最大为70%，确保金额显示清晰
    // 如果是最大值且需要调整，则使用调整系数
    const isMax = dayExpense === maxExpense && heightAdjustment < 1
    const heightRatio = isMax ? heightAdjustment : 1
    const height = maxExpense > 0 
      ? (dayExpense / maxExpense) * 70 * heightRatio
      : 0
    
    chartData.value.push({
      date: dayStr,
      expense: dayExpense,
      height: height,
      label: '周' + weekdays[i] + ' ' + dayNumber + '日',
      needScroll: true, // 将周视图也设置为需要滚动，确保所有数据可见
      isMax: isMax // 标记是否为被调整的最大值
    })
  }
  
  // 默认选中当日对应的柱子
  const today = formatShortDate(new Date())
  const currentWeekDay = chartData.value.find(item => item.date === today)
  selectedBarDate.value = currentWeekDay 
    ? currentWeekDay.date 
    : (chartData.value.length > 0 ? chartData.value[0].date : '')
}

// 获取月统计数据
const getMonthRecords = () => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  
  // 获取所有记录
  const allRecords = uni.getStorageSync('records') || []
  
  // 过滤出本月的记录
  const monthRecords = allRecords.filter(record => {
    const recordDate = new Date(record.date)
    return recordDate >= monthStart && recordDate <= monthEnd && record.type === 'expense'
  })
  
  // 处理数据并更新图表
  processMonthData(monthRecords, monthStart, monthEnd)
}

// 处理月数据
const processMonthData = (records, monthStart, monthEnd) => {
  // 计算总支出
  totalExpense.value = records.reduce((sum, record) => sum + parseFloat(record.amount), 0)
  
  // 按类别统计
  const categories = {}
  records.forEach(record => {
    const category = record.category
    if (!categories[category]) {
      categories[category] = 0
    }
    categories[category] += parseFloat(record.amount)
  })
  
  // 格式化类别数据
  expenseCategories.value = Object.keys(categories)
    .map(name => {
      const amount = categories[name]
    const percentage = totalExpense.value > 0 
      ? Math.round((amount / totalExpense.value) * 100) 
        : 0
      return { name, amount, percentage }
    })
    .sort((a, b) => b.amount - a.amount)
  
  // 生成柱状图数据，显示每一天
  chartData.value = []
  const daysInMonth = monthEnd.getDate()
  
  // 初始化每一天的支出数据
  const dailyExpenses = new Array(daysInMonth + 1).fill(0)
  
  // 统计每天的支出
  records.forEach(record => {
    const recordDate = new Date(record.date)
    const day = recordDate.getDate()
    dailyExpenses[day] += parseFloat(record.amount)
  })
  
  // 找出最大支出值用于计算高度比例
  const maxDailyExpense = Math.max(...dailyExpenses)
  
  // 为月份的每一天创建数据点
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${monthStart.getFullYear()}-${(monthStart.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    
    // 计算高度百分比，最大为70%，确保金额显示清晰
    const height = maxDailyExpense > 0 
      ? (dailyExpenses[day] / maxDailyExpense) * 70
      : 0
    
    chartData.value.push({
      date: dayStr,
      expense: dailyExpenses[day],
      height: height,
      label: day + '日',
      needScroll: true // 月视图需要滚动
    })
  }
  
  // 默认选中当前日期（如果在当前月份内）
  const today = new Date()
  if (today.getFullYear() === monthStart.getFullYear() && today.getMonth() === monthStart.getMonth()) {
    const day = today.getDate()
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    selectedBarDate.value = todayStr
  } else {
    selectedBarDate.value = chartData.value.length > 0 ? chartData.value[0].date : ''
  }
}

// 获取年统计数据
const getYearRecords = () => {
  const year = currentDate.value.getFullYear()
  
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)
  
  // 获取所有记录
  const allRecords = uni.getStorageSync('records') || []
  
  // 过滤出本年的记录
  const yearRecords = allRecords.filter(record => {
    const recordDate = new Date(record.date)
    return recordDate >= yearStart && recordDate <= yearEnd && record.type === 'expense'
  })
  
  // 处理数据并更新图表
  processYearData(yearRecords, year)
}

// 处理年数据
const processYearData = (yearRecords, year) => {
  // 计算总支出
  totalExpense.value = yearRecords.reduce((sum, record) => sum + parseFloat(record.amount), 0)
  
  // 按类别统计
  const categories = {}
  yearRecords.forEach(record => {
    const category = record.category
    if (!categories[category]) {
      categories[category] = 0
    }
    categories[category] += parseFloat(record.amount)
  })
  
  // 格式化类别数据
  expenseCategories.value = Object.keys(categories)
    .map(name => {
      const amount = categories[name]
      const percentage = totalExpense.value > 0 
        ? Math.round((amount / totalExpense.value) * 100) 
        : 0
      return { name, amount, percentage }
    })
    .sort((a, b) => b.amount - a.amount)
  
  // 生成柱状图数据，显示每个月
  chartData.value = []
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  
  // 初始化每月支出数据
  const monthlyExpenses = new Array(12).fill(0)
  
  // 统计每月支出
  yearRecords.forEach(record => {
    const recordDate = new Date(record.date)
    const month = recordDate.getMonth()
    monthlyExpenses[month] += parseFloat(record.amount)
  })
  
  // 找出最大月支出用于计算高度比例
  const maxMonthlyExpense = Math.max(...monthlyExpenses)
  
  // 为一年的每个月创建数据点
  for (let month = 0; month < 12; month++) {
    const monthStr = `${year}-${(month + 1).toString().padStart(2, '0')}`
    
    // 计算高度百分比，最大为70%，确保金额显示清晰
    const height = maxMonthlyExpense > 0 
      ? (monthlyExpenses[month] / maxMonthlyExpense) * 70 
      : 0
    
    chartData.value.push({
      date: monthStr,
      expense: monthlyExpenses[month],
      height: height,
      label: monthNames[month],
      needScroll: true // 年视图需要滚动以显示所有月份
    })
  }
  
  // 默认选中当前月份
  const today = new Date()
  if (today.getFullYear() === year) {
    const currentMonth = `${year}-${(today.getMonth() + 1).toString().padStart(2, '0')}`
    selectedBarDate.value = currentMonth
  } else {
    selectedBarDate.value = chartData.value.length > 0 ? chartData.value[0].date : ''
  }
}

// 选择柱子
const selectBar = (date) => {
  selectedBarDate.value = date
}

// 格式化日期为YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化短日期为YYYY-MM-DD
const formatShortDate = (date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化显示日期
const formatDisplayDate = (date) => {
  switch (currentStatType.value) {
    case 'week': {
      const weekStart = new Date(date)
      const currentDay = weekStart.getDay() || 7
      weekStart.setDate(weekStart.getDate() - (currentDay - 1))
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      // 简化日期显示
      const formatDay = (d) => {
        return `${d.getMonth() + 1}月${d.getDate()}日`
      }
      
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月${weekStart.getDate()}-${weekEnd.getDate()}日`
      } else {
        return `${formatDay(weekStart)}-${formatDay(weekEnd)}`
      }
    }
    case 'month':
      return `${date.getFullYear()}年${date.getMonth() + 1}月`
    case 'year':
      return `${date.getFullYear()}年`
    default:
      return formatDate(date)
  }
}

// 根据类别返回对应图标
const getCategoryIcon = (category) => {
  const iconMap = {
    '餐饮': '🍽️',
    '水果': '🍎',
    '零食': '🍪',
    '日用': '🛒',
    '数码': '💻',
    '住房': '🏠',
    '娱乐': '🎮',
    '汽车': '🚗',
    '通讯': '📱',
    '购物': '🛍️',
    '交通': '🚇',
    '医疗': '💊',
    '宠物': '🐱',
    '社交': '👥',
    '学习': '📚',
    '美容': '💄',
    '旅行': '✈️',
    '健身': '🏋️',
    '服饰': '👔',
    '礼物': '🎁',
    '水电': '💡',
    '办公': '📎',
    '维修': '🔧',
    '家电': '📺',
    '家居': '🛋️',
    '育儿': '👶',
    '教育': '🎓',
    '其他': '📝'
  }
  return iconMap[category] || '📝'
}

// 处理记录更新事件
const handleRecordUpdate = (newRecord) => {
  console.log('统计页面收到记录更新事件', newRecord)
  // 更新统计数据
  getStatistics()
}

// 页面显示时刷新数据
const onShow = () => {
  getStatistics()
}

// 页面加载时初始化
onMounted(() => {
  // 添加onShow生命周期
  uni.$on('onShow', onShow)

  // 添加记录更新事件监听
  uni.$on('recordUpdated', handleRecordUpdate)
  
  // 初始加载数据
  getStatistics()
  
  // 监听页面显示事件
  const handlePageShow = () => {
    console.log('统计页面显示，刷新数据')
    getStatistics()
  }
  
  // 添加页面显示监听
  uni.$on('onTabItemTap', (item) => {
    if (item.pagePath.includes('statistics')) {
      handlePageShow()
    }
  })
})

// 组件销毁时取消订阅
onUnmounted(() => {
  uni.$off('onShow', onShow)
  uni.$off('recordUpdated', handleRecordUpdate)
  uni.$off('onTabItemTap')
})

// 获取柱状图颜色
const getBarColor = (item, index) => {
  // 如果支出为0，返回透明色
  if (item.expense <= 0) {
    return 'transparent';
  }

  // 如果是选中的条目，返回主题色
  if (item.active) {
    return '#52c41a';
  }

  // 根据不同视图类型选择不同的颜色方案
  let colors = [];
  if (currentStatType.value === 'month') {
    // 月视图使用蓝色系渐变
    colors = ['#a8d7ff', '#7ec2ff', '#5eaafc', '#3e95f5', '#1e82ea'];
  } else if (currentStatType.value === 'week') {
    // 周视图使用绿色系渐变
    colors = ['#b5e5a9', '#98d78a', '#7cc868', '#61ba49', '#52c41a'];
  } else {
    // 年视图使用紫色系渐变
    colors = ['#d9bffd', '#c29efa', '#ab7df7', '#945bf3', '#7a3aee'];
  }

  // 根据支出金额大小选择颜色深浅
  const maxExpense = Math.max(...chartData.value.map(i => i.expense || 0));
  if (maxExpense > 0) {
    const ratio = item.expense / maxExpense;
    // 根据比例选择颜色
    if (ratio > 0.8) return colors[4];
    if (ratio > 0.6) return colors[3];
    if (ratio > 0.4) return colors[2];
    if (ratio > 0.2) return colors[1];
    return colors[0];
  }

  // 如果都不符合，使用默认颜色
  return '#e8e8e8';
}
</script>

<script>
export default {
  onShow() {
    // 页面显示时刷新数据
    console.log('统计页面原生onShow生命周期触发')
    this.getStatistics && this.getStatistics()
  }
}
</script>

<style>
.container {
  padding: 20rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.header {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.05);
}

.stat-type-selector {
  display: flex;
  justify-content: space-around;
  margin: 0 auto;
  max-width: 600rpx;
  background-color: #f7f7f7;
  border-radius: 40rpx;
  padding: 5rpx;
  margin-bottom: 20rpx;
}

.stat-type-item {
  padding: 16rpx 30rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  color: #666;
  text-align: center;
  transition: all 0.3s;
}

.stat-type-item.active {
  background-color: #1890ff;
  color: #fff;
  box-shadow: 0 4rpx 8rpx rgba(24, 144, 255, 0.2);
}

.date-navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10rpx;
}

.nav-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1890ff;
}

.nav-icon {
  font-size: 24rpx;
}

.date-picker {
  flex: 1;
  text-align: center;
  max-width: 300rpx;
}

.current-date {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.overview {
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  color: #fff;
  box-shadow: 0 10rpx 20rpx rgba(24, 144, 255, 0.15);
}

.overview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.overview-label {
  font-size: 28rpx;
  opacity: 0.9;
  margin-bottom: 10rpx;
}

.overview-value {
  font-size: 52rpx;
  font-weight: bold;
}

.chart-container {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.05);
}

.chart-wrapper {
  padding: 20rpx;
  background-color: #fff;
  border-radius: 16rpx;
  margin-top: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  position: relative;
}

.chart-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-title-text {
  display: flex;
  align-items: center;
}

.chart-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: 6rpx;
}

.chart-empty {
  height: 320rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.empty-image {
  width: 180rpx;
  height: 180rpx;
  margin-bottom: 16rpx;
  opacity: 0.7;
}

.chart-empty-text {
  font-size: 26rpx;
  color: #999;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 320rpx;
}

.loading-dot {
  display: inline-block;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background-color: #1890ff;
  margin: 0 8rpx;
  animation: loadingPulse 1.4s infinite ease-in-out both;
}

.loading-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loadingPulse {
  0%, 80%, 100% { 
    transform: scale(0);
  } 
  40% { 
    transform: scale(1);
  }
}

/* 滚动优化 */
.smooth-scroll {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  scrollbar-width: none; /* Firefox */
}

.smooth-scroll::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Edge */
}

/* 修改垂直柱状图样式（日期在x轴，金额在y轴） */
.bar-chart-wrapper.vertical {
  padding: 20rpx 10rpx;
  height: 400rpx;
  margin-bottom: 20rpx;
}

.bar-chart-wrapper.vertical::after {
  /* 移除底部边框线 */
  display: none;
}

.bar-inner.vertical {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  height: 100%;
  /* 确保年视图有足够的宽度显示所有月份 */
  min-width: 1440rpx;
  padding: 0 20rpx;
}

/* 对于周视图，使用不同的最小宽度 */
.bar-inner.vertical.week-view {
  min-width: 840rpx; /* 每个柱形约120rpx，7天共需840rpx */
}

.bar-item.vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 10rpx;
  /* 调整宽度确保能显示所有月份 */
  width: 80rpx;
  min-height: 300rpx;
  justify-content: flex-end;
}

/* 周视图中的柱形项宽度可以更大些 */
.week-view .bar-item.vertical {
  width: 110rpx;
}

.bar-label.vertical {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #666;
  white-space: nowrap;
  text-align: center;
}

/* 周视图中的标签可能比较长，需要调整宽度 */
.week-view .bar-label.vertical {
  font-size: 22rpx;
  width: 110rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 2rpx;
}

.bar-container.vertical {
  width: 75%;
  height: 220rpx;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-bottom: 0;
}

.bar.vertical {
  width: 100%;
  border-radius: 12rpx 12rpx 4rpx 4rpx;
  transform-origin: bottom;
  opacity: 0.85;
  animation: barGrow 1s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bar-amount.vertical {
  font-size: 22rpx;
  font-weight: 600;
  color: #555;
  margin-bottom: 10rpx;
  opacity: 0;
  transition: all 0.3s ease;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

@keyframes barGrow {
  from {
    height: 0 !important;
    opacity: 0;
    transform: scaleY(0.5);
  }
  to {
    opacity: 0.85;
    transform: scaleY(1);
  }
}

.bar-active .bar.vertical {
  opacity: 1;
  transform: scaleY(1.05);
}

.bar-item.vertical:hover .bar {
  opacity: 0.9;
  transform: scaleY(1.05);
}

.bar-item.vertical:hover .bar-amount.vertical {
  opacity: 1;
  transform: translateY(-4rpx);
}

.bar-active .bar-amount.vertical {
  opacity: 1;
  transform: translateY(-4rpx);
}

/* 调整月视图滚动区域样式 */
.bar-scroll.smooth-scroll {
  height: 350rpx;
  white-space: nowrap;
}

/* 删除不再使用的水平样式 */
.bar-chart-wrapper.horizontal,
.bar-inner.horizontal,
.bar-item.horizontal,
.bar-label.horizontal,
.bar-container.horizontal,
.bar.horizontal,
.bar-amount.horizontal {
  /* 这些样式不再需要 */
}

@keyframes barGrowHorizontal {
  /* 这个动画不再需要 */
}

.category-distribution {
  padding: 30rpx 10rpx;
}

.distribution-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.category-list {
  overflow: auto;
  max-height: 600rpx;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 10rpx;
  border-bottom: 1rpx solid #f8f8f8;
}

.category-info {
  display: flex;
  align-items: center;
}

.category-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background-color: #ffeaea;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 20rpx;
  font-size: 32rpx;
}

.category-detail {
  display: flex;
  flex-direction: column;
}

.category-name {
  font-size: 30rpx;
  color: #333;
  margin-bottom: 5rpx;
}

.category-percentage {
  font-size: 24rpx;
  color: #1890ff;
}

.category-amount {
  font-size: 32rpx;
  color: #ff4d4f;
  font-weight: 500;
}
</style> 