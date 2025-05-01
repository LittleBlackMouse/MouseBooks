<template>
  <view class="profile-container">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-avatar">
        <image src="@/static/images/app-logo.svg" mode="aspectFit" class="logo-image"></image>
      </view>
      <view class="user-info">
        <text class="user-name">小鼠记账</text>
        <text class="user-subtitle">让记账更简单、更有趣</text>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="function-section">
      <view class="section-title">数据管理</view>
      <view class="function-list">
        <view class="function-item" @click="showBackupRestore">
          <view class="function-icon backup">📦</view>
          <view class="function-content">
            <text class="function-name">备份与恢复</text>
            <text class="function-desc">保存或恢复您的记账数据</text>
          </view>
          <text class="arrow-icon">›</text>
        </view>
        
        <view class="function-item" @click="showExportData">
          <view class="function-icon export">📊</view>
          <view class="function-content">
            <text class="function-name">数据导出</text>
            <text class="function-desc">导出为Excel表格</text>
          </view>
          <text class="arrow-icon">›</text>
        </view>
        
        <view class="function-item" @click="showDeleteConfirm">
          <view class="function-icon clear">🗑️</view>
          <view class="function-content">
            <text class="function-name">清空数据</text>
            <text class="function-desc danger">删除所有记账数据</text>
          </view>
          <text class="arrow-icon">›</text>
        </view>
        
        <view class="function-item" @click="showBatchAddRecords">
          <view class="function-icon batch-add">📋</view>
          <view class="function-content">
            <text class="function-name">批量添加记录</text>
            <text class="function-desc">快速添加多条记账记录</text>
          </view>
          <text class="arrow-icon">›</text>
        </view>
      </view>
    </view>
    
    <view class="function-section">
      <view class="section-title">关于应用</view>
      <view class="function-list">
        <view class="function-item" @click="showAbout">
          <view class="function-icon about">ℹ️</view>
          <view class="function-content">
            <text class="function-name">关于小鼠记账</text>
            <text class="function-desc">版本 1.0.0</text>
          </view>
          <text class="arrow-icon">›</text>
        </view>
        
        <view class="function-item" @click="showFeedback">
          <view class="function-icon feedback">📝</view>
          <view class="function-content">
            <text class="function-name">意见反馈</text>
            <text class="function-desc">帮助我们改进应用</text>
          </view>
          <text class="arrow-icon">›</text>
        </view>
      </view>
    </view>
    
    <!-- 版权信息 -->
    <view class="copyright">
      <text class="copyright-text">© 2025 小鼠记账 版权所有</text>
    </view>
  </view>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  setup() {
    // 显示即将推出的提示
    const showComingSoon = () => {
      uni.showToast({
        title: '功能即将推出',
        icon: 'none',
        duration: 2000
      })
    }
    
    // 显示备份与恢复选项
    const showBackupRestore = () => {
      uni.showActionSheet({
        itemList: ['创建备份', '从备份恢复'],
        success: function(res) {
          if (res.tapIndex === 0) {
            // 创建备份
            createBackup()
          } else if (res.tapIndex === 1) {
            // 从备份恢复
            restoreFromBackup()
          }
        }
      })
    }
    
    // 创建备份
    const createBackup = () => {
      try {
        const records = uni.getStorageSync('records') || []
        const userCategories = uni.getStorageSync('userCategories') || []
        
        const backupData = {
          records: records,
          userCategories: userCategories,
          backupDate: new Date().toISOString()
        }
        
        // 保存备份数据
        uni.setStorageSync('backupData', JSON.stringify(backupData))
        
        uni.showToast({
          title: '备份成功',
          icon: 'success',
          duration: 2000
        })
      } catch (e) {
        uni.showToast({
          title: '备份失败',
          icon: 'none',
          duration: 2000
        })
        console.error('备份失败', e)
      }
    }
    
    // 从备份恢复
    const restoreFromBackup = () => {
      try {
        const backupDataStr = uni.getStorageSync('backupData')
        
        if (!backupDataStr) {
          uni.showToast({
            title: '未找到备份数据',
            icon: 'none',
            duration: 2000
          })
          return
        }
        
        // 解析备份数据
        const backupData = JSON.parse(backupDataStr)
        
        // 确认恢复操作
        uni.showModal({
          title: '恢复数据',
          content: `确定要从 ${new Date(backupData.backupDate).toLocaleString()} 的备份恢复数据吗？这将覆盖当前数据。`,
          success: function(res) {
            if (res.confirm) {
              // 恢复数据
              uni.setStorageSync('records', backupData.records)
              uni.setStorageSync('userCategories', backupData.userCategories)
              
              // 发送数据更新事件
              uni.$emit('recordUpdated', { isRestore: true })
              
              uni.showToast({
                title: '恢复成功',
                icon: 'success',
                duration: 2000
              })
            }
          }
        })
      } catch (e) {
        uni.showToast({
          title: '恢复失败',
          icon: 'none',
          duration: 2000
        })
        console.error('恢复失败', e)
      }
    }
    
    // 导出数据
    const showExportData = () => {
      uni.showActionSheet({
        itemList: ['导出为JSON', '导出为CSV'],
        success: function(res) {
          if (res.tapIndex === 0) {
            // 导出JSON
            exportAsJson()
          } else if (res.tapIndex === 1) {
            // 导出CSV
            exportAsCsv()
          }
        }
      })
    }
    
    // 导出为JSON文件
    const exportAsJson = () => {
      try {
        const records = uni.getStorageSync('records') || []
        if (records.length === 0) {
          uni.showToast({
            title: '暂无记录数据可导出',
            icon: 'none',
            duration: 2000
          })
          return
        }
        
        const exportData = {
          records: records,
          userCategories: uni.getStorageSync('userCategories') || [],
          exportDate: new Date().toISOString(),
          appVersion: '1.0.0'
        }
        
        // 添加BOM标记解决中文乱码问题
        const jsonStr = '\ufeff' + JSON.stringify(exportData, null, 2)
        
        // 创建下载文件名
        const fileName = `小鼠记账数据备份_${new Date().toISOString().split('T')[0]}.json`
        
        // 根据平台使用不同的导出方式
        // #ifdef H5
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.click()
        URL.revokeObjectURL(url)
        
        uni.showToast({
          title: 'JSON导出成功',
          icon: 'success',
          duration: 2000
        })
        // #endif
        
        // #ifdef APP-PLUS
        // Android平台使用plus API保存文件
        const savePath = plus.io.convertLocalFileSystemURL('_doc/' + fileName)
        const fileEntry = plus.io.resolveLocalFileSystemURL('_doc')
        
        plus.io.requestFileSystem(plus.io.PRIVATE_DOC, function(fs) {
          fs.root.getFile(fileName, { create: true }, function(fileEntry) {
            fileEntry.createWriter(function(writer) {
              writer.onwrite = function() {
                uni.showModal({
                  title: '导出成功',
                  content: '文件已保存到：' + savePath,
                  showCancel: false
                })
              }
              writer.onerror = function(e) {
                uni.showToast({
                  title: '保存文件失败',
                  icon: 'none'
                })
              }
              writer.write(jsonStr)
            })
          })
        })
        // #endif
        
        // #ifdef MP
        uni.setClipboardData({
          data: jsonStr,
          success: function() {
            uni.showModal({
              title: '导出成功',
              content: 'JSON数据已复制到剪贴板，请粘贴保存到文件中',
              showCancel: false
            })
          }
        })
        // #endif
      } catch (e) {
        uni.showToast({
          title: '导出失败',
          icon: 'none',
          duration: 2000
        })
        console.error('导出失败', e)
      }
    }
    
    // 导出为CSV文件
    const exportAsCsv = () => {
      try {
        const records = uni.getStorageSync('records') || []
        if (records.length === 0) {
          uni.showToast({
            title: '暂无记录数据可导出',
            icon: 'none',
            duration: 2000
          })
          return
        }
        
        // 创建CSV头部，添加BOM标记解决Excel打开乱码问题
        let csvContent = '\ufeff日期,类型,金额,类别,备注\n'
        
        // 添加记录数据
        records.forEach(record => {
          const date = record.date ? record.date.replace(/T.*$/, '') : ''
          const type = record.type === 'expense' ? '支出' : '收入'
          const amount = record.amount || 0
          const category = record.category || ''
          const remark = record.remark ? `"${record.remark.replace(/"/g, '""')}"` : ''
          
          csvContent += `${date},${type},${amount},${category},${remark}\n`
        })
        
        // 创建下载文件名
        const fileName = `小鼠记账数据_${new Date().toISOString().split('T')[0]}.csv`
        
        // #ifdef H5
        // 创建Blob对象并下载
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.click()
        URL.revokeObjectURL(url)
        
        uni.showToast({
          title: 'CSV导出成功',
          icon: 'success',
          duration: 2000
        })
        // #endif
        
        // #ifdef APP-PLUS
        // Android平台使用plus API保存文件
        const savePath = plus.io.convertLocalFileSystemURL('_doc/' + fileName)
        
        plus.io.requestFileSystem(plus.io.PRIVATE_DOC, function(fs) {
          fs.root.getFile(fileName, { create: true }, function(fileEntry) {
            fileEntry.createWriter(function(writer) {
              writer.onwrite = function() {
                uni.showModal({
                  title: '导出成功',
                  content: '文件已保存到：' + savePath,
                  showCancel: false
                })
              }
              writer.onerror = function(e) {
                uni.showToast({
                  title: '保存文件失败',
                  icon: 'none'
                })
              }
              writer.write(csvContent)
            })
          })
        })
        // #endif
        
        // #ifdef MP
        uni.setClipboardData({
          data: csvContent,
          success: function() {
            uni.showModal({
              title: '导出成功',
              content: 'CSV数据已复制到剪贴板，请粘贴保存到文件中',
              showCancel: false
            })
          }
        })
        // #endif
      } catch (e) {
        uni.showToast({
          title: '导出失败',
          icon: 'none',
          duration: 2000
        })
        console.error('导出失败', e)
      }
    }
    
    // 显示删除确认
    const showDeleteConfirm = () => {
      uni.showModal({
        title: '清空数据',
        content: '确定要删除所有记账数据吗？此操作不可恢复！',
        confirmColor: '#ff4d4f',
        success: function(res) {
          if (res.confirm) {
            // 清空数据
            uni.removeStorageSync('records')
            
            // 发送数据更新事件
            uni.$emit('recordUpdated', { isCleared: true })
            
            uni.showToast({
              title: '数据已清空',
              icon: 'success',
              duration: 2000
            })
          }
        }
      })
    }
    
    // 显示关于信息
    const showAbout = () => {
      uni.showModal({
        title: '关于小鼠记账',
        content: '小鼠记账是一款简洁易用的个人记账应用，帮助您轻松管理日常收支。\n\n版本：1.0.0\n开发者：小鼠工作室',
        showCancel: false
      })
    }
    
    // 显示反馈
    const showFeedback = () => {
      uni.showModal({
        title: '意见反馈',
        content: '感谢您的使用！如有任何建议或问题，请发送邮件至：2972493214@qq.com',
        showCancel: false
      })
    }
    
    // 显示批量添加记录的选项
    const showBatchAddRecords = () => {
      uni.showModal({
        title: '批量添加记录',
        content: '请将多条记账记录粘贴到下方输入框，格式为JSON数组',
        editable: true,
        placeholderText: '[{"date": "2023-05-01", "type": "expense", "amount": 99.8, "category": "餐饮", "remark": "晚餐"}]',
        success: function(res) {
          if (res.confirm && res.content) {
            // 处理粘贴的批量数据
            processBatchRecords(res.content);
          }
        }
      });
    };
    
    // 处理粘贴的批量数据
    const processBatchRecords = (data) => {
      try {
        const records = JSON.parse(data);
        if (!Array.isArray(records) || records.length === 0) {
          throw new Error('数据格式不正确或为空');
        }
        // 处理批量记录数据
        records.forEach(record => {
          // 这里可以添加逻辑来处理每条记录
          console.log('添加记录:', record);
          // 假设我们将记录添加到本地存储
          let existingRecords = uni.getStorageSync('records') || [];
          existingRecords.push(record);
          uni.setStorageSync('records', existingRecords);
        });
        // 发送数据更新事件
        uni.$emit('recordUpdated', { isBatchAdd: true });
        uni.showToast({
          title: '批量添加成功',
          icon: 'success',
          duration: 2000
        });
      } catch (error) {
        uni.showModal({
          title: '添加失败',
          content: '数据格式不正确，请检查后重试',
          showCancel: false
        });
      }
    };
    
    return {
      showComingSoon,
      showBackupRestore,
      showExportData,
      showDeleteConfirm,
      showAbout,
      showFeedback,
      createBackup,
      restoreFromBackup,
      exportAsJson,
      exportAsCsv,
      showBatchAddRecords,
      processBatchRecords
    }
  }
}
</script>

<style>
.profile-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 30rpx;
}

.user-card {
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  border-radius: 20rpx;
  padding: 40rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 8rpx 20rpx rgba(24, 144, 255, 0.2);
  margin-bottom: 30rpx;
  position: relative;
  overflow: hidden;
}

.user-card::after {
  content: '';
  position: absolute;
  top: -50rpx;
  right: -50rpx;
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  z-index: 1;
}

.user-avatar {
  width: 150rpx;
  height: 150rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.15);
  margin-right: 40rpx;
  overflow: hidden;
  border: 3rpx solid rgba(255, 255, 255, 0.8);
  z-index: 2;
}

.logo-image {
  width: 90%;
  height: 90%;
}

.user-info {
  flex: 1;
  z-index: 2;
}

.user-name {
  font-size: 40rpx;
  color: #fff;
  font-weight: bold;
  margin-bottom: 12rpx;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}

.user-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  display: block;
}

.function-section {
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 30rpx;
  color: #666;
  margin-bottom: 15rpx;
  padding-left: 20rpx;
  position: relative;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8rpx;
  width: 8rpx;
  height: 28rpx;
  background-color: #1890ff;
  border-radius: 4rpx;
}

.function-list {
  background-color: #fff;
  border-radius: 15rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.function-item {
  display: flex;
  align-items: center;
  padding: 30rpx 40rpx;
  position: relative;
}

.function-item:not(:last-child):after {
  content: '';
  position: absolute;
  left: 40rpx;
  right: 40rpx;
  bottom: 0;
  height: 1rpx;
  background-color: #f0f0f0;
}

.function-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 30rpx;
  font-size: 40rpx;
}

.backup {
  background-color: #e6fffb;
  color: #13c2c2;
}

.export {
  background-color: #fcffe6;
  color: #a0d911;
}

.import {
  background-color: #f6ffed;
  color: #52c41a;
}

.clear {
  background-color: #fff1f0;
  color: #f5222d;
}

.about {
  background-color: #f0f5ff;
  color: #2f54eb;
}

.feedback {
  background-color: #f5f5f5;
  color: #595959;
}

.function-content {
  flex: 1;
}

.function-name {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.function-desc {
  font-size: 24rpx;
  color: #999;
}

.function-desc.danger {
  color: #ff4d4f;
}

.arrow-icon {
  font-size: 40rpx;
  color: #bbb;
  margin-left: 20rpx;
}

.copyright {
  text-align: center;
  padding: 40rpx 0;
}

.copyright-text {
  font-size: 24rpx;
  color: #999;
}

.batch-add {
  background-color: #e6f7ff;
  color: #1890ff;
  font-size: 40rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style> 